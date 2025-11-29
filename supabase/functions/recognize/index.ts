import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock person IDs for testing - in real implementation, this would use face recognition
const mockPersonIds = [
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Sarah
  'b2c3d4e5-f6a7-8901-bcde-f12345678901', // Michael
  'c3d4e5f6-a7b8-9012-cdef-123456789012', // Dr. Emily Chen
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Recognize endpoint called');
    
    // Accept multipart form data with image
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const image = formData.get('image');
      
      if (image) {
        console.log('Image received for recognition');
      }
    }

    // Mock face recognition - randomly return a person or null (no face detected)
    const shouldRecognize = Math.random() > 0.3; // 70% chance of recognition
    
    if (shouldRecognize) {
      const randomIndex = Math.floor(Math.random() * mockPersonIds.length);
      const personId = mockPersonIds[randomIndex];
      
      console.log(`Mock recognition result: personId = ${personId}`);
      
      return new Response(
        JSON.stringify({ 
          personId,
          confidence: 0.85 + Math.random() * 0.14 // Mock confidence between 0.85-0.99
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('Mock recognition result: no face detected');
      
      return new Response(
        JSON.stringify({ 
          personId: null,
          message: 'No face detected'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in recognize function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Recognition failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
