import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.73.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, add_context_from_internet = false, response_json_schema = null, file_urls = null } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // ✅ PRIMARY: Try OpenAI API Key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiKey && openaiKey.startsWith('sk-')) {
      try {
        console.log('🔑 Using EXTERNAL OpenAI API Key');
        
        const openai = new OpenAI({ apiKey: openaiKey });

        const messages = [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: prompt }
        ];

        const requestOptions = {
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7
        };

        // Add JSON schema if specified
        if (response_json_schema) {
          requestOptions.response_format = {
            type: 'json_schema',
            json_schema: {
              name: 'response',
              strict: true,
              schema: response_json_schema
            }
          };
        }

        const completion = await openai.chat.completions.create(requestOptions);
        
        const content = completion.choices[0].message.content;
        
        console.log('✅ OpenAI API Success');
        
        // Parse JSON if schema was requested
        if (response_json_schema) {
          try {
            return Response.json(JSON.parse(content));
          } catch {
            return Response.json({ response: content });
          }
        }
        
        return Response.json({ response: content });

      } catch (openaiError) {
        console.warn('⚠️ OpenAI API Error, falling back to InvokeLLM:', openaiError.message);
        
        // ✅ FALLBACK: Use Base44 InvokeLLM
        try {
          console.log('🔄 Falling back to Base44 InvokeLLM');
          
          const fallbackResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet,
            response_json_schema,
            file_urls
          });

          console.log('✅ Fallback InvokeLLM Success');
          
          return Response.json(
            response_json_schema ? fallbackResponse : { response: fallbackResponse }
          );

        } catch (fallbackError) {
          console.error('❌ Both OpenAI and InvokeLLM failed:', fallbackError);
          return Response.json({ 
            error: 'AI service temporarily unavailable',
            details: fallbackError.message 
          }, { status: 500 });
        }
      }
    }

    // ✅ NO API KEY: Use InvokeLLM directly
    console.log('ℹ️ No OpenAI key, using Base44 InvokeLLM');
    
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet,
      response_json_schema,
      file_urls
    });

    console.log('✅ InvokeLLM Success');
    
    return Response.json(
      response_json_schema ? response : { response }
    );

  } catch (error) {
    console.error('❌ invokeAI Error:', error);
    return Response.json({ 
      error: 'Failed to process AI request',
      details: error.message 
    }, { status: 500 });
  }
});