// 美观的截图渐变背景预设
export interface GradientPreset {
  name: string;
  gradient: {
    type: 'linear' | 'radial';
    direction?: string;
    colors: string[];
  };
}

/**
 * 获取所有预设的渐变背景
 * 包含15个精心设计的美观渐变效果
 */
export function getGradientPresets(): GradientPreset[] {
  return [
    {
      name: 'Twitter Blue',
   gradient: {
  type: 'linear',
direction: 'to bottom right',
        colors: ['#1DA1F2', '#0084b4', '#00657a']
      }
    },
    {
   name: 'Vibrant Sunset',
      gradient: {
        type: 'linear',
        direction: 'to bottom right',
        colors: ['#ff6b6b', '#ffa726', '#ffcc02']
      }
    },
    {
      name: 'Ocean Breeze',
      gradient: {
type: 'linear',
        direction: 'to bottom right',
        colors: ['#667eea', '#764ba2', '#5b73e8']
  }
    },
    {
      name: 'Purple Dream',
    gradient: {
        type: 'linear',
 direction: 'to bottom right',
 colors: ['#a8edea', '#fed6e3', '#d6336c']
      }
    },
    {
      name: 'Fresh Nature',
      gradient: {
        type: 'linear',
        direction: 'to bottom right',
        colors: ['#56ab2f', '#a8e6cf', '#7fcdcd']
      }
 },
    {
      name: 'Night Sky',
      gradient: {
        type: 'radial',
      direction: 'circle at center',
        colors: ['#2c3e50', '#34495e', '#4a6741']
      }
    },
    {
 name: 'Rose Gold',
      gradient: {
   type: 'linear',
        direction: 'to bottom right',
   colors: ['#f093fb', '#f5576c', '#ff6b9d']
      }
    },
    {
      name: 'Cool Mint',
      gradient: {
   type: 'linear',
  direction: 'to bottom right',
        colors: ['#4facfe', '#00f2fe', '#43e97b']
      }
    },
    {
      name: 'Cosmic Purple',
      gradient: {
  type: 'linear',
        direction: 'to bottom right',
        colors: ['#667db6', '#0082c8', '#74b9ff']
    }
    },
    {
      name: 'Warm Orange',
      gradient: {
     type: 'linear',
 direction: 'to bottom right',
 colors: ['#fa709a', '#fee140', '#ffa751']
   }
    },
    {
      name: 'Electric Blue',
      gradient: {
        type: 'linear',
        direction: 'to bottom right',
  colors: ['#00c6ff', '#0072ff', '#74b9ff']
      }
    },
    {
      name: 'Green Paradise',
      gradient: {
        type: 'linear',
      direction: 'to bottom right',
        colors: ['#11998e', '#38ef7d', '#7bed9f']
      }
    },
    {
 name: 'Cherry Blossom',
 gradient: {
        type: 'linear',
        direction: 'to bottom right',
   colors: ['#ff9a9e', '#fecfef', '#ffc3d8']
      }
    },
    {
      name: 'Deep Space',
      gradient: {
        type: 'radial',
        direction: 'ellipse at center',
        colors: ['#000428', '#004e92', '#009ffd']
      }
    },
    {
      name: 'Golden Hour',
      gradient: {
        type: 'linear',
        direction: 'to bottom right',
        colors: ['#ffb347', '#ffcc33', '#ff8a80']
      }
    }
  ];
}

/**
 * 根据名称获取特定的渐变预设
 */
export function getGradientByName(name: string): GradientPreset | undefined {
  return getGradientPresets().find(preset => preset.name === name);
}

/**
 * 获取随机渐变预设
 */
export function getRandomGradient(): GradientPreset {
  const presets = getGradientPresets();
  const randomIndex = Math.floor(Math.random() * presets.length);
  return presets[randomIndex];
}