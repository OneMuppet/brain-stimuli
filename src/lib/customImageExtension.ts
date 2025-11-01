// Custom Tiptap Image extension that stores image IDs in data attributes
import Image from '@tiptap/extension-image';

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-image-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-image-id'),
        renderHTML: attributes => {
          const attrs: Record<string, string> = {};
          if (attributes['data-image-id']) {
            attrs['data-image-id'] = String(attributes['data-image-id']);
          }
          return attrs;
        },
      },
    };
  },
});

