import type { Preview } from '@storybook/web-components';
import '../src/themes/glass.css';

/**
 * Global background gradient to showcase the glassmorphism effect.
 * The semi-transparent glass surfaces need a colourful backdrop to shine.
 */
const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        "deep-space": {
          name: 'deep-space',
          value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        },

        twilight: {
          name: 'twilight',
          value: 'linear-gradient(135deg, #0f0c29, #302b63, #7b2d8e)',
        },

        ocean: {
          name: 'ocean',
          value: 'linear-gradient(135deg, #0a1628, #1a3a5c, #0d4a6e)',
        },

        light: {
          name: 'light',
          value: 'linear-gradient(135deg, #f5f7fa, #e4e9f0)',
        }
      }
    },
    controls: {
      matchers: {
        color: /(background|color|accent)/i,
        date: /Date$/i,
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'deep-space'
    }
  }
};

export default preview;
