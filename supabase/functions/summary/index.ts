import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract personId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const personId = pathParts[pathParts.length - 1];

    if (!personId || personId === 'summary') {
      return new Response(
        JSON.stringify({ error: 'Person ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating summary for person: ${personId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch person info
    const { data: person, error: personError } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .maybeSingle();

    if (personError) {
      console.error('Error fetching person:', personError);
      throw personError;
    }

    if (!person) {
      return new Response(
        JSON.stringify({ error: 'Person not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch memory updates
    const { data: memoryUpdates, error: memoryError } = await supabase
      .from('memory_updates')
      .select('text, created_at')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (memoryError) {
      console.error('Error fetching memory updates:', memoryError);
    }

    // Fetch conversation history
    const { data: conversations, error: convError } = await supabase
      .from('conversation_history')
      .select('transcript, created_at')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (convError) {
      console.error('Error fetching conversations:', convError);
    }

    // Build context for AI
    const memoryContext = (memoryUpdates || [])
      .map(m => m.text)
      .join('\n- ');

    const conversationContext = (conversations || [])
      .map(c => c.transcript)
      .join('\n- ');

    // Generate summary using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are helping a dementia patient remember someone they know. Generate a short, warm, and reassuring summary about this person.

Person's name: ${person.name}
Relationship: ${person.relationship}

Memory notes about this person:
- ${memoryContext || 'No specific memories recorded yet.'}

Recent conversations:
- ${conversationContext || 'No recent conversations recorded.'}

Generate a friendly, simple summary (2-3 sentences max) that helps the patient remember who this person is and feel comfortable. Use simple words and a warm tone. Focus on the relationship and key positive memories. Start directly with the information, don't say things like "This is..." or "Here's...".`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a gentle, caring assistant helping dementia patients remember their loved ones. Keep responses simple, warm, and reassuring. Never use complex words or long sentences.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      // Return a default summary if AI fails
      return new Response(
        JSON.stringify({
          name: person.name,
          relationship: person.relationship,
          photoUrl: person.photo_url,
          summary: `${person.name} is your ${person.relationship.toLowerCase()}. They care about you very much.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || 
      `${person.name} is your ${person.relationship.toLowerCase()}. They care about you very much.`;

    console.log(`Generated summary for ${person.name}`);

    return new Response(
      JSON.stringify({
        name: person.name,
        relationship: person.relationship,
        photoUrl: person.photo_url,
        summary: summary.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summary function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
