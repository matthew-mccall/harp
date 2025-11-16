// Text-to-Speech service using 11Labs API
import { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } from './env';

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface TTSResponse {
  success: boolean;
  audioBuffer?: Buffer;
  audioBase64?: string;
  error?: string;
}

/**
 * Convert text to speech using 11Labs API
 */
export async function textToSpeech(options: TTSOptions): Promise<TTSResponse> {
  const {
    text,
    voiceId = ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Default to Bella voice
    modelId = 'eleven_multilingual_v2',
    voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  } = options;

  if (!ELEVENLABS_API_KEY) {
    console.error('[TTS] 11Labs API key not configured');
    return {
      success: false,
      error: '11Labs API key not configured',
    };
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] 11Labs API error:', response.status, errorText);
      return {
        success: false,
        error: `11Labs API error: ${response.status} ${errorText}`,
      };
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const audioBase64 = audioBuffer.toString('base64');

    console.log('[TTS] Audio generated successfully, size:', audioBuffer.length, 'bytes');

    return {
      success: true,
      audioBuffer,
      audioBase64,
    };
  } catch (error: any) {
    console.error('[TTS] Error generating speech:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Get available voices from 11Labs
 */
export async function getVoices(): Promise<any> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('11Labs API key not configured');
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[TTS] Error fetching voices:', error);
    throw error;
  }
}
