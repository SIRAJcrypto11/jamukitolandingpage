import { base44 } from './base44Client';

export const Core = base44.integrations.Core;

// ════════════════════════════════════════════════════════════════
// ✅ EXTERNAL API KEYS CONFIGURATION
// ════════════════════════════════════════════════════════════════
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || "";

// ════════════════════════════════════════════════════════════════
// ✅ CLOUDINARY CONFIGURATION
// ════════════════════════════════════════════════════════════════
const CLOUDINARY_CLOUD_NAME = "dr7jmnefv";
const CLOUDINARY_API_KEY_CLD = "233231354457479";
const CLOUDINARY_API_SECRET = "yIve6vHrWYQHF5xzJx6w3Zk6gEo";

// ════════════════════════════════════════════════════════════════
// ✅ HELPER: Call OpenAI
// ════════════════════════════════════════════════════════════════
const callOpenAI = async (prompt, schema) => {
    console.log('🤖 InvokeLLM: Trying OpenAI...');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "system", content: "You are a helpful assistant. Output JSON." }, { role: "user", content: prompt }],
            response_format: schema ? { type: "json_object" } : undefined,
            temperature: 0.3
        })
    });
    if (!res.ok) throw new Error(`OpenAI Error: ${res.statusText}`);
    const data = await res.json();
    const content = data.choices[0].message.content;
    return schema ? JSON.parse(content) : content;
};

// ✅ HELPER: Call Claude
const callClaude = async (prompt, schema) => {
    console.log('🤖 InvokeLLM: Trying Claude...');
    const claudePrompt = prompt + (schema ? "\n\nCRITICAL: OUTPUT MUST BE VALID JSON matching this schema: " + JSON.stringify(schema) : "");
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 2000,
            messages: [{ role: "user", content: claudePrompt }]
        })
    });
    if (!res.ok) throw new Error(`Claude Error: ${res.statusText}`);
    const data = await res.json();
    const content = data.content[0].text;
    if (schema) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    }
    return content;
};

// ════════════════════════════════════════════════════════════════
// ✅ HELPER: Upload to Cloudinary (Direct, NO Base44)
// ════════════════════════════════════════════════════════════════
const generateSignature = async (params, secret) => {
    const sortedKeys = Object.keys(params).sort();
    const signatureString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + secret;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const uploadToCloudinary = async (file) => {
    console.log('☁️ CLOUDINARY DIRECT: Uploading', file.name);
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp };
    const signature = await generateSignature(paramsToSign, CLOUDINARY_API_SECRET);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', CLOUDINARY_API_KEY_CLD);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ CLOUDINARY SUCCESS:', data.secure_url);
    return {
        file_url: data.secure_url,
        file_id: data.public_id,
        original_name: file.name
    };
};

// ════════════════════════════════════════════════════════════════
// ✅ GLOBAL INVOKE LLM — Base44 first → OpenAI → Claude
// ════════════════════════════════════════════════════════════════
export const InvokeLLM = async ({ prompt, response_json_schema }) => {
    // 1️⃣ Try Base44 first (uses integration credits)
    try {
        console.log('🔵 InvokeLLM: Trying Base44...');
        const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema });

        // STRENGTHENED: Check validity
        if (!result) throw new Error('Base44 LLM returned empty result');

        console.log('✅ Base44 InvokeLLM success');
        return result;
    } catch (base44Error) {
        console.warn('⚠️ Base44 InvokeLLM failed (credit habis?):', base44Error.message);
    }

    // 2️⃣ Fallback to OpenAI
    try {
        return await callOpenAI(prompt, response_json_schema);
    } catch (e1) {
        console.warn('⚠️ OpenAI failed, attempting Claude...', e1.message);
    }

    // 3️⃣ Fallback to Claude
    try {
        return await callClaude(prompt, response_json_schema);
    } catch (e2) {
        console.error('❌ All AI services failed.');
        throw new Error('Semua layanan AI gagal merespons.');
    }
};

// ════════════════════════════════════════════════════════════════
// ✅ GLOBAL UPLOAD FILE — Base44 first → Cloudinary
// ════════════════════════════════════════════════════════════════
export const UploadFile = async ({ file }) => {
    // 1️⃣ Try Base44 first (uses integration credits)
    try {
        console.log('🔵 UploadFile: Trying Base44...');
        const result = await base44.integrations.Core.UploadFile({ file });

        // STRENGTHENED: Check if we actually got a URL
        if (!result || !result.file_url) {
            console.warn('⚠️ Base44 returned no file_url:', result);
            throw new Error('Base44 upload returned invalid response');
        }

        console.log('✅ Base44 Upload success:', result.file_url);
        return result;
    } catch (base44Error) {
        console.warn('⚠️ Base44 Upload failed (credit habis?):', base44Error.message);
        console.log('🔄 Switching to Cloudinary direct upload...');
    }

    // 2️⃣ Fallback to Cloudinary direct (NO Base44 needed)
    try {
        return await uploadToCloudinary(file);
    } catch (cloudinaryError) {
        console.error('❌ Cloudinary juga gagal:', cloudinaryError.message);

        // 3️⃣ Nuclear Option: Base64 Data URI (Simpan di DB langsung)
        try {
            console.warn('⚠️ All uploads failed. Falling back to Base64 Data URI (LocalDB storage).');
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    // Basic validation: Don't allow massive files to choke DB
                    if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64
                        reject(new Error('File too large for local database storage fallback (>2MB)'));
                    } else {
                        resolve({ file_url: reader.result });
                    }
                };
                reader.onerror = error => reject(error);
            });
        } catch (base64Error) {
            throw new Error('Upload gagal total (Base44, Cloudinary, & Base64).');
        }
    }
};

// ════════════════════════════════════════════════════════════════
// ✅ OTHER INTEGRATIONS (still via Base44)
// ════════════════════════════════════════════════════════════════
export const SendEmail = base44.integrations.Core.SendEmail;
export const GenerateImage = base44.integrations.Core.GenerateImage;
export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = base44.integrations.Core.CreateFileSignedUrl;
export const UploadPrivateFile = base44.integrations.Core.UploadPrivateFile;


