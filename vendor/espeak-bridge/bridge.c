/*
 * espeak_bridge — minimal C ABI over espeak-ng for phonemization only.
 *
 * Mirrors Cobaltium Android's tts_jni.cpp (minus JNI): initialise espeak with
 * AUDIO_OUTPUT_SYNCHRONOUS, select a voice, then walk espeak_TextToPhonemes in
 * IPA mode appending each clause plus a trailing space.
 *
 * espeak-ng is GPLv3; this bridge links it statically and is therefore also
 * distributed under GPLv3 (see THIRD_PARTY_LICENSES / docs/tts-espeak.md).
 */
#include <espeak-ng/speak_lib.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#define EB_EXPORT __declspec(dllexport)
#else
#define EB_EXPORT __attribute__((visibility("default")))
#endif

static int g_initialized = 0;

EB_EXPORT int espeak_bridge_init(const char *data_path) {
  if (data_path == NULL) {
    return -1;
  }
  /* AUDIO_OUTPUT_SYNCHRONOUS = 2; no audio is ever played. */
  int rate = espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, data_path, 0);
  if (rate < 0) {
    return rate;
  }
  g_initialized = 1;
  return rate;
}

static void select_voice(const char *voice) {
  if (voice == NULL || voice[0] == '\0') {
    return;
  }
  if (espeak_SetVoiceByName(voice) == 0) {
    return;
  }
  /* Fall back to the 2-letter language code so the language's rules are used
   * deterministically rather than silently defaulting to English. */
  char lang[3];
  lang[0] = voice[0];
  lang[1] = voice[1];
  lang[2] = '\0';
  espeak_VOICE spec;
  memset(&spec, 0, sizeof(spec));
  spec.languages = lang;
  espeak_SetVoiceByProperties(&spec);
}

/* Phonemize `text` in `voice`; writes NUL-terminated IPA to `out`.
 * Returns the number of bytes needed (excl. NUL), or -1 on error. When the
 * needed length is >= cap the caller should retry with a larger buffer. */
EB_EXPORT int espeak_bridge_phonemize(const char *voice, const char *text,
                                      char *out, int cap) {
  if (!g_initialized || voice == NULL || text == NULL || out == NULL) {
    return -1;
  }
  out[0] = '\0';
  if (text[0] == '\0') {
    return 0;
  }

  select_voice(voice);

  size_t len = 0;
  size_t buf_cap = 256;
  char *buf = (char *)malloc(buf_cap);
  if (buf == NULL) {
    return -1;
  }

  const char *cursor = text;
  const void **ptr = (const void **)&cursor;
  while (ptr != NULL && *ptr != NULL) {
    const char *clause =
        espeak_TextToPhonemes(ptr, espeakCHARS_AUTO, espeakPHONEMES_IPA);
    if (clause != NULL && clause[0] != '\0') {
      size_t clause_len = strlen(clause);
      if (len + clause_len + 2 > buf_cap) {
        buf_cap = (len + clause_len + 2) * 2;
        char *grown = (char *)realloc(buf, buf_cap);
        if (grown == NULL) {
          free(buf);
          return -1;
        }
        buf = grown;
      }
      memcpy(buf + len, clause, clause_len);
      len += clause_len;
      buf[len++] = ' ';
    }
  }

  if (cap > 0) {
    int n = ((int)len < cap - 1) ? (int)len : cap - 1;
    memcpy(out, buf, (size_t)n);
    out[n] = '\0';
  }
  free(buf);
  return (int)len;
}

EB_EXPORT void espeak_bridge_terminate(void) {
  if (g_initialized) {
    espeak_Terminate();
    g_initialized = 0;
  }
}
