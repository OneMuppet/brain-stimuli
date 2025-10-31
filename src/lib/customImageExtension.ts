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
          const attrs: Record<string, any> = {};
          if (attributes['data-image-id']) {
            attrs['data-image-id'] = attributes['data-image-id'];
          }
          return attrs;
        },
      },
    };
  },
});

