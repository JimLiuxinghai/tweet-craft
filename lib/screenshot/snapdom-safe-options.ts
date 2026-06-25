const UNSAFE_CAPTURE_TAGS = new Set(['script', 'noscript', 'template']);

/**
 * Shared snapdom guards for hostile pages with strict CSP.
 */
export function createSnapdomSafeOptions() {
  return {
    exclude: ['script', 'noscript', 'template', '.tsc-action-button'],
    filter: (node: Element) => {
      const tagName = node.tagName?.toLowerCase();
      if (tagName && UNSAFE_CAPTURE_TAGS.has(tagName)) {
        return false;
      }

      return !node.classList?.contains('tsc-action-button');
    }
  };
}
