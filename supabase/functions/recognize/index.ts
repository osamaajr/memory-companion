import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

const region = Deno.env.get("AWS_REGION") ?? "us-east-1";
const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
const collectionId = Deno.env.get("REKOGNITION_COLLECTION_ID") ?? "";

// AWS Signature V4 helpers
async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

function toHex(arr: Uint8Array): string {
  return new TextDecoder().decode(hexEncode(arr));
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + key), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

async function signRequest(
  method: string,
  host: string,
  path: string,
  body: string,
  amzTarget: string
): Promise<Headers> {
  const service = "rekognition";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const contentType = "application/x-amz-json-1.1";
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${amzTarget}\n`;
  
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const payloadHash = toHex(await sha256(body));
  
  const canonicalRequest = [
    method,
    path,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest))
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("X-Amz-Date", amzDate);
  headers.set("X-Amz-Target", amzTarget);
  headers.set("Authorization", authorizationHeader);
  
  return headers;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

async function searchFacesByImage(imageBytes: Uint8Array): Promise<{ faceMatches: any[]; error?: string }> {
  const host = `rekognition.${region}.amazonaws.com`;
  const path = "/";
  const amzTarget = "RekognitionService.SearchFacesByImage";
  
  // Convert bytes to base64 (chunked to avoid stack overflow)
  const base64Image = uint8ArrayToBase64(imageBytes);
  
  const requestBody = JSON.stringify({
    CollectionId: collectionId,
    Image: {
      Bytes: base64Image
    },
    FaceMatchThreshold: 85,
    MaxFaces: 1
  });

  console.log("Calling Rekognition with collection:", collectionId);

  const headers = await signRequest("POST", host, path, requestBody, amzTarget);
  
  const response = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers,
    body: requestBody
  });

  const responseText = await response.text();
  console.log("Rekognition response status:", response.status);
  
  if (!response.ok) {
    console.error("Rekognition error:", responseText);
    return { faceMatches: [], error: responseText };
  }

  const data = JSON.parse(responseText);
  console.log("Rekognition response:", JSON.stringify(data, null, 2));
  
  return { faceMatches: data.FaceMatches || [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate configuration
    if (!collectionId) {
      console.error("REKOGNITION_COLLECTION_ID not configured");
      return new Response(
        JSON.stringify({ error: "Rekognition collection not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!accessKeyId || !secretAccessKey) {
      console.error("AWS credentials not configured");
      return new Response(
        JSON.stringify({ error: "AWS credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const form = await req.formData();
    const imageFile = form.get("image") as File | null;

    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log("Image received, size:", bytes.length, "bytes");

    // Call Rekognition
    const { faceMatches, error: rekError } = await searchFacesByImage(bytes);

    if (rekError) {
      // Parse AWS error to give user-friendly response
      try {
        const awsError = JSON.parse(rekError);
        if (awsError.__type === "InvalidParameterException" && awsError.Message?.includes("no faces")) {
          console.log("No face detected in image");
          return new Response(
            JSON.stringify({ personId: null, message: "No face detected in image" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // Not JSON, continue with generic error
      }
      return new Response(
        JSON.stringify({ error: rekError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (faceMatches.length === 0) {
      console.log("No face match found");
      return new Response(
        JSON.stringify({ personId: null, message: "No matching face found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = faceMatches[0];
    const externalId = match.Face?.ExternalImageId;

    console.log("Matched external_id:", externalId, "Similarity:", match.Similarity);

    if (!externalId) {
      return new Response(
        JSON.stringify({ personId: null, message: "Match had no external_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up person in database
    const { data: person, error: dbError } = await supabase
      .from("people")
      .select("id, name")
      .eq("external_id", externalId)
      .maybeSingle();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ personId: null, message: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!person) {
      console.log("No person row for external_id:", externalId);
      return new Response(
        JSON.stringify({ personId: null, message: `Person not registered (external_id: ${externalId})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found person:", person.name, "id:", person.id);

    return new Response(
      JSON.stringify({
        personId: person.id,
        confidence: match.Similarity ?? null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Recognize error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
