import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock external IDs that match our test data in the people table
const mockExternalIds = ["PERSON1", "PERSON2", "PERSON3"];

// SUPABASE CONFIG
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  console.log("Recognize endpoint called");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Invalid content type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form
    const form = await req.formData();
    const imageFile = form.get("image") as File | null;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image received for recognition");

    // MOCK RECOGNITION: Randomly select an external_id or return no match
    // 30% chance of no face detected
    if (Math.random() < 0.3) {
      console.log("Mock recognition result: no face detected");
      return new Response(JSON.stringify({ personId: null, message: "No match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select a random person from our mock data
    const randomIndex = Math.floor(Math.random() * mockExternalIds.length);
    const externalId = mockExternalIds[randomIndex];
    console.log("Mock recognition result: external_id =", externalId);

    // Look up person in Supabase
    const { data: person, error } = await supabase
      .from("people")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (person) {
      console.log("Found person with id:", person.id);
    }

    return new Response(JSON.stringify({ personId: person?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
