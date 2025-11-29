import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RekognitionClient, SearchFacesByImageCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.540.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase env vars missing");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const rekognition = new RekognitionClient({
  region: Deno.env.get("AWS_REGION"),
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

const collectionId = Deno.env.get("REKOGNITION_COLLECTION_ID") ?? Deno.env.get("AWS_COLLECTION_ID") ?? "";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const imageFile = form.get("image") as File | null;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // File -> bytes
    const arrayBuffer = await imageFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log("Image received, calling Rekognition...");

    const command = new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: { Bytes: bytes },
      FaceMatchThreshold: 85,
      MaxFaces: 1,
    });

    const result = await rekognition.send(command);

    if (!result.FaceMatches || result.FaceMatches.length === 0) {
      console.log("No face match");
      return new Response(
        JSON.stringify({
          personId: null,
          message: "No matching face found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const match = result.FaceMatches[0];
    const externalId = match.Face?.ExternalImageId;

    console.log("Matched external_id:", externalId);

    if (!externalId) {
      return new Response(
        JSON.stringify({
          personId: null,
          message: "Match had no external_id",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up person in Supabase
    const { data: person, error } = await supabase
      .from("people")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({
          personId: null,
          message: "Database error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!person) {
      console.log("No person row for external_id", externalId);
      return new Response(
        JSON.stringify({
          personId: null,
          message: "Person not registered",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Found person id:", person.id);

    return new Response(
      JSON.stringify({
        personId: person.id,
        confidence: match.Similarity ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Recognize error:", err);
    return new Response(
      JSON.stringify({
        error: "Recognition failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
