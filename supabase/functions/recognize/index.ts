import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RekognitionClient, SearchFacesByImageCommand } from "npm:@aws-sdk/client-rekognition";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AWS CONFIG
const rekognition = new RekognitionClient({
  region: Deno.env.get("AWS_REGION"),
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

// SUPABASE CONFIG
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Invalid content type" }), {
        headers: corsHeaders,
      });
    }

    // Parse multipart form
    const form = await req.formData();
    const imageFile = form.get("image") as File | null;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        headers: corsHeaders,
      });
    }

    // Convert file → bytes
    const arrayBuffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log("Image received. Calling AWS Rekognition...");

    // Call AWS Rekognition collection
    const command = new SearchFacesByImageCommand({
      CollectionId: Deno.env.get("AWS_COLLECTION_ID")!,
      Image: { Bytes: bytes },
      FaceMatchThreshold: 85,
      MaxFaces: 1,
    });

    const result = await rekognition.send(command);

    if (!result.FaceMatches || result.FaceMatches.length === 0) {
      return new Response(JSON.stringify({ personId: null, message: "No match" }), {
        headers: corsHeaders,
      });
    }

    // Get the matched ExternalImageId
    const externalId = result.FaceMatches[0].Face!.ExternalImageId!;
    console.log("AWS matched external_id =", externalId);

    // Look up person in Supabase
    const { data: person, error } = await supabase
      .from("people")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
    }

    return new Response(JSON.stringify({ personId: person?.id ?? null }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
