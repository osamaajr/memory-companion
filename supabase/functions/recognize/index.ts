import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock external IDs for testing - in real implementation, this would use face recognition
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const data = await req.json();

    // Rekognition sends this
    const externalId = data.external_id;

    console.log("Received external_id:", externalId);

    if (!externalId) {
      return new Response(JSON.stringify({ person: null }), {
        headers: { "content-type": "application/json" },
      });
    }

    const { data: person, error } = await supabase
      .from("people")
      .select("*")
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
    }

    return new Response(JSON.stringify({ person }), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ person: null }), {
      headers: { "content-type": "application/json" },
    });
  }
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Recognize endpoint called");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Accept multipart form data with image
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const image = formData.get("image");

      if (image) {
        console.log("Image received for recognition");
      }
    }

    // Mock face recognition - randomly return an external_id or null (no face detected)
    const shouldRecognize = Math.random() > 0.3; // 70% chance of recognition

    if (shouldRecognize) {
      const randomIndex = Math.floor(Math.random() * mockExternalIds.length);
      const externalId = mockExternalIds[randomIndex];

      console.log(`Mock recognition result: external_id = ${externalId}`);

      // Look up person by external_id
      const { data: person, error } = await supabase
        .from("people")
        .select("id")
        .eq("external_id", externalId)
        .maybeSingle();

      if (error) {
        console.error("Database lookup error:", error);
        return new Response(
          JSON.stringify({
            personId: null,
            message: "Database lookup failed",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (person) {
        console.log(`Found person with id: ${person.id}`);
        return new Response(
          JSON.stringify({
            personId: person.id,
            confidence: 0.85 + Math.random() * 0.14, // Mock confidence between 0.85-0.99
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else {
        console.log(`No person found with external_id: ${externalId}`);
        return new Response(
          JSON.stringify({
            personId: null,
            message: "Person not registered",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      console.log("Mock recognition result: no face detected");

      return new Response(
        JSON.stringify({
          personId: null,
          message: "No face detected",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error in recognize function:", error);

    return new Response(
      JSON.stringify({
        error: "Recognition failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
