import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalResult?: (text: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = 'zh-CN', continuous = true, interimResults = true, onFinalResult } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const shouldRestartRef = useRef(false);
  const manualStopRef = useRef(false);
  // Use ref for callback to avoid effect re-run
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        setTranscript(finalTranscriptRef.current);
        onFinalResultRef.current?.(finalText);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
        shouldRestartRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // no-speech is normal during pauses — keep shouldRestart true for auto-reconnect
        // Don't show error to user, just let onend handle reconnection
      } else if (event.error === 'aborted') {
        // Manual abort, do nothing
      } else {
        setError(`识别出错: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && !manualStopRef.current) {
        // Auto-reconnect for long speech recording
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      manualStopRef.current = true;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [lang, continuous, interimResults]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    shouldRestartRef.current = true;
    manualStopRef.current = false;

    try {
      recognitionRef.current.start();
    } catch {
      // If already started, try abort first then start
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            setError('无法启动语音识别，请刷新页面重试');
            shouldRestartRef.current = false;
          }
        }, 100);
      } catch {
        setError('无法启动语音识别，请刷新页面重试');
        shouldRestartRef.current = false;
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    shouldRestartRef.current = false;
    manualStopRef.current = true;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: transcript + interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
