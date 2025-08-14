// 截图设置组件
import { EnhancedScreenshotService } from '@/lib/screenshot/EnhancedScreenshotService';
import { i18nManager } from '@/lib/i18n';
import './screenshot-settings.css';

export interface ScreenshotSettingsOptions {
  backgroundColor?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    direction?: string;
    colors: string[];
  };
  useContentOptions: boolean;
}

export class ScreenshotSettingsPanel {
  private container: HTMLElement;
  private options: ScreenshotSettingsOptions;

  constructor(container: HTMLElement, initialOptions: ScreenshotSettingsOptions) {
    this.container = container;
  this.options = initialOptions;
    this.render();
    this.setupLanguageListener();
  }

  private setupLanguageListener(): void {
    // 监听语言变化事件
    window.addEventListener('localeChanged', () => {
      this.render();
    });
  }

  private render(): void {
    const presetGradients = EnhancedScreenshotService.getPresetGradients();

    this.container.innerHTML = `
      <div class="screenshot-settings">
        <section class="settings-section">
     <h3>📷 ${i18nManager.t('screenshot.settings.title')}</h3>
          <div class="background-options">
        <label class="option-item">
            <input type="checkbox" id="use-content-options" ${this.options.useContentOptions ? 'checked' : ''}>
            <span class="checkmark"></span>
     ${i18nManager.t('screenshot.settings.content_options')}
     </label>
          </div>
        </section>

   <section class="settings-section">
          <h3>🎨 ${i18nManager.t('screenshot.settings.background_style')}</h3>
     <div class="background-type-selector">
   <label class="background-option">
  <input type="radio" name="background-type" value="none" ${!this.options.backgroundColor && !this.options.backgroundGradient ? 'checked' : ''}>
              <span class="background-preview solid-preview" style="background: transparent; border: 2px dashed #ccc;"></span>
  <span>${i18nManager.t('screenshot.settings.no_background')}</span>
  </label>
  
  <label class="background-option">
   <input type="radio" name="background-type" value="solid" ${this.options.backgroundColor ? 'checked' : ''}>
 <span class="background-preview solid-preview" style="background: ${this.options.backgroundColor || '#ffffff'};"></span>
      <span>${i18nManager.t('screenshot.settings.solid_background')}</span>
            </label>
            
 <label class="background-option">
         <input type="radio" name="background-type" value="gradient" ${this.options.backgroundGradient ? 'checked' : ''}>
              <span class="background-preview gradient-preview"></span>
              <span>${i18nManager.t('screenshot.settings.gradient_background')}</span>
        </label>
          </div>
        </section>

        <section class="settings-section" id="solid-color-settings" style="display: ${this.options.backgroundColor ? 'block' : 'none'};">
          <h4>${i18nManager.t('screenshot.settings.select_color')}</h4>
       <div class="color-picker-wrapper">
   <input type="color" id="background-color" value="${this.options.backgroundColor || '#ffffff'}">
          <label for="background-color">${i18nManager.t('screenshot.settings.select_color')}</label>
   </div>
      </section>

        <section class="settings-section" id="gradient-settings" style="display: ${this.options.backgroundGradient ? 'block' : 'none'};">
     <h4>${i18nManager.t('screenshot.settings.select_gradient')}</h4>
   <div class="gradient-presets">
 ${presetGradients.map((preset, index) => `
      <div class="gradient-preset ${this.isCurrentGradient(preset.gradient) ? 'active' : ''}" 
       data-gradient='${JSON.stringify(preset.gradient)}'>
           <div class="gradient-preview" style="background: ${this.generateGradientCSS(preset.gradient)};"></div>
        <span class="gradient-name">${preset.name}</span>
              </div>
     `).join('')}
          </div>
      
    <div class="custom-gradient-section">
          <h5>${i18nManager.t('screenshot.settings.custom_gradient')}</h5>
 <div class="gradient-controls">
     <div class="gradient-type-selector">
   <label>
                  <input type="radio" name="gradient-type" value="linear" ${!this.options.backgroundGradient || this.options.backgroundGradient.type === 'linear' ? 'checked' : ''}>
${i18nManager.t('screenshot.settings.linear_gradient')}
          </label>
                <label>
                  <input type="radio" name="gradient-type" value="radial" ${this.options.backgroundGradient?.type === 'radial' ? 'checked' : ''}>
       ${i18nManager.t('screenshot.settings.radial_gradient')}
          </label>
              </div>
      
    <div class="gradient-direction" id="linear-direction" style="display: ${(!this.options.backgroundGradient || this.options.backgroundGradient.type === 'linear') ? 'block' : 'none'};">
 <label for="gradient-direction-select">${i18nManager.t('screenshot.settings.direction')}:</label>
         <select id="gradient-direction-select">
        <option value="to right" ${this.options.backgroundGradient?.direction === 'to right' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.left_to_right')}</option>
          <option value="to left" ${this.options.backgroundGradient?.direction === 'to left' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.right_to_left')}</option>
 <option value="to bottom" ${this.options.backgroundGradient?.direction === 'to bottom' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.top_to_bottom')}</option>
      <option value="to top" ${this.options.backgroundGradient?.direction === 'to top' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.bottom_to_top')}</option>
       <option value="to bottom right" ${this.options.backgroundGradient?.direction === 'to bottom right' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.top_left_to_bottom_right')}</option>
  <option value="to bottom left" ${this.options.backgroundGradient?.direction === 'to bottom left' ? 'selected' : ''}>${i18nManager.t('screenshot.settings.top_right_to_bottom_left')}</option>
         </select>
    </div>
   
           <div class="gradient-colors">
      <label>${i18nManager.t('screenshot.settings.color_1')}:</label>
              <input type="color" id="gradient-color-1" value="${this.options.backgroundGradient?.colors[0] || '#1DA1F2'}">
                <label>${i18nManager.t('screenshot.settings.color_2')}:</label>
       <input type="color" id="gradient-color-2" value="${this.options.backgroundGradient?.colors[1] || '#0d8bd9'}">
    </div>
   </div>
     
            <div class="gradient-preview-container">
           <div id="custom-gradient-preview" class="gradient-preview-large" style="background: ${this.options.backgroundGradient ? this.generateGradientCSS(this.options.backgroundGradient) : 'linear-gradient(to right, #1DA1F2, #0d8bd9)'};"></div>
          </div>
          </div>
        </section>

        <div class="action-buttons">
        <button id="save-screenshot-settings" class="primary-button">
            ${i18nManager.t('screenshot.settings.save')}
          </button>
    <button id="reset-screenshot-settings" class="secondary-button">
            ${i18nManager.t('screenshot.settings.reset')}
    </button>
        </div>
      </div>
  `;

    this.attachEventListeners();
    this.updateGradientPreview();
  }

  private attachEventListeners(): void {
    // 背景类型切换
    const backgroundTypeInputs = this.container.querySelectorAll('input[name="background-type"]');
    backgroundTypeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleBackgroundTypeChange((e.target as HTMLInputElement).value);
      });
    });

    // 渐变类型切换
    const gradientTypeInputs = this.container.querySelectorAll('input[name="gradient-type"]');
    gradientTypeInputs.forEach(input => {
  input.addEventListener('change', () => {
        this.updateGradientTypeVisibility();
   this.updateGradientPreview();
      });
    });

    // 渐变预设选择
    const gradientPresets = this.container.querySelectorAll('.gradient-preset');
    gradientPresets.forEach(preset => {
      preset.addEventListener('click', (e) => {
        this.handleGradientPresetSelect(e.currentTarget as HTMLElement);
      });
    });

    // 颜色和方向变化
    const colorInputs = this.container.querySelectorAll('#gradient-color-1, #gradient-color-2, #background-color');
  const directionSelect = this.container.querySelector('#gradient-direction-select');

    colorInputs.forEach(input => {
      input.addEventListener('change', () => {
this.updateGradientPreview();
      });
    });

    if (directionSelect) {
      directionSelect.addEventListener('change', () => {
        this.updateGradientPreview();
    });
    }

    // 保存按钮
    const saveButton = this.container.querySelector('#save-screenshot-settings');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // 重置按钮
    const resetButton = this.container.querySelector('#reset-screenshot-settings');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetSettings();
      });
    }
  }

  private handleBackgroundTypeChange(type: string): void {
 const solidSettings = this.container.querySelector('#solid-color-settings') as HTMLElement;
    const gradientSettings = this.container.querySelector('#gradient-settings') as HTMLElement;

    switch (type) {
      case 'none':
  solidSettings.style.display = 'none';
        gradientSettings.style.display = 'none';
        break;
      case 'solid':
        solidSettings.style.display = 'block';
        gradientSettings.style.display = 'none';
        break;
   case 'gradient':
        solidSettings.style.display = 'none';
        gradientSettings.style.display = 'block';
        break;
    }
  }

  private updateGradientTypeVisibility(): void {
    const isLinear = (this.container.querySelector('input[name="gradient-type"]:checked') as HTMLInputElement)?.value === 'linear';
    const directionSection = this.container.querySelector('#linear-direction') as HTMLElement;
    
    if (directionSection) {
      directionSection.style.display = isLinear ? 'block' : 'none';
    }
  }

  private updateGradientPreview(): void {
const preview = this.container.querySelector('#custom-gradient-preview') as HTMLElement;
    if (!preview) return;

    const type = (this.container.querySelector('input[name="gradient-type"]:checked') as HTMLInputElement)?.value || 'linear';
    const direction = (this.container.querySelector('#gradient-direction-select') as HTMLSelectElement)?.value || 'to right';
    const color1 = (this.container.querySelector('#gradient-color-1') as HTMLInputElement)?.value || '#1DA1F2';
    const color2 = (this.container.querySelector('#gradient-color-2') as HTMLInputElement)?.value || '#0d8bd9';

    const gradient = {
 type: type as 'linear' | 'radial',
      direction: type === 'linear' ? direction : 'circle',
   colors: [color1, color2]
    };

 preview.style.background = this.generateGradientCSS(gradient);
  }

  private handleGradientPresetSelect(presetElement: HTMLElement): void {
    // 移除所有活动状态
    this.container.querySelectorAll('.gradient-preset').forEach(p => p.classList.remove('active'));
    
    // 添加活动状态到选中的预设
    presetElement.classList.add('active');

    // 获取渐变数据
    const gradientData = JSON.parse(presetElement.dataset.gradient || '{}');
  
    // 更新表单控件
    this.updateFormFromGradient(gradientData);
    
    // 更新预览
    this.updateGradientPreview();
  }

  private updateFormFromGradient(gradient: any): void {
    // 设置渐变类型
    const typeInput = this.container.querySelector(`input[name="gradient-type"][value="${gradient.type}"]`) as HTMLInputElement;
    if (typeInput) {
      typeInput.checked = true;
      this.updateGradientTypeVisibility();
    }

    // 设置方向
    if (gradient.type === 'linear') {
      const directionSelect = this.container.querySelector('#gradient-direction-select') as HTMLSelectElement;
      if (directionSelect) {
directionSelect.value = gradient.direction || 'to right';
      }
    }

    // 设置颜色
    if (gradient.colors && gradient.colors.length >= 2) {
   const color1Input = this.container.querySelector('#gradient-color-1') as HTMLInputElement;
      const color2Input = this.container.querySelector('#gradient-color-2') as HTMLInputElement;
 
      if (color1Input) color1Input.value = gradient.colors[0];
      if (color2Input) color2Input.value = gradient.colors[1];
    }
  }

  private generateGradientCSS(gradient: { type: 'linear' | 'radial'; direction?: string; colors: string[] }): string {
    const { type, direction, colors } = gradient;
const gradientDirection = direction || (type === 'linear' ? 'to right' : 'circle');
    const colorStops = colors.join(', ');
    return `${type}-gradient(${gradientDirection}, ${colorStops})`;
  }

  private isCurrentGradient(gradient: any): boolean {
    if (!this.options.backgroundGradient) return false;
    
    const current = this.options.backgroundGradient;
    return (
      current.type === gradient.type &&
      current.direction === gradient.direction &&
      JSON.stringify(current.colors) === JSON.stringify(gradient.colors)
    );
  }

  private saveSettings(): void {
    const useContentOptions = (this.container.querySelector('#use-content-options') as HTMLInputElement)?.checked || false;
    const backgroundType = (this.container.querySelector('input[name="background-type"]:checked') as HTMLInputElement)?.value;

    let newOptions: ScreenshotSettingsOptions = {
      useContentOptions
    };

    switch (backgroundType) {
      case 'solid':
        const backgroundColor = (this.container.querySelector('#background-color') as HTMLInputElement)?.value;
        newOptions.backgroundColor = backgroundColor;
        break;
 case 'gradient':
      const type = (this.container.querySelector('input[name="gradient-type"]:checked') as HTMLInputElement)?.value || 'linear';
        const direction = (this.container.querySelector('#gradient-direction-select') as HTMLSelectElement)?.value || 'to right';
 const color1 = (this.container.querySelector('#gradient-color-1') as HTMLInputElement)?.value || '#1DA1F2';
        const color2 = (this.container.querySelector('#gradient-color-2') as HTMLInputElement)?.value || '#0d8bd9';

  newOptions.backgroundGradient = {
          type: type as 'linear' | 'radial',
     direction: type === 'linear' ? direction : 'circle',
      colors: [color1, color2]
    };
        break;
    }

    this.options = newOptions;

  // 触发保存事件
  const event = new CustomEvent('screenshot-settings-changed', {
      detail: newOptions
    });
    this.container.dispatchEvent(event);

    // 显示保存成功消息
    this.showNotification(i18nManager.t('screenshot.settings.saved'), 'success');
  }

  private resetSettings(): void {
    const defaultOptions: ScreenshotSettingsOptions = {
      useContentOptions: true,
      backgroundGradient: {
   type: 'linear',
        direction: 'to right',
     colors: ['#1DA1F2', '#0d8bd9']
    }
    };

    this.options = defaultOptions;
    this.render();
    
    // 触发重置事件
    const event = new CustomEvent('screenshot-settings-reset', {
   detail: defaultOptions
    });
    this.container.dispatchEvent(event);

    this.showNotification(i18nManager.t('screenshot.settings.reset_success'), 'success');
}

  private showNotification(message: string, type: 'success' | 'error'): void {
    // 创建简单的通知
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 12px 20px;
   border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      opacity: 0;
  transition: opacity 0.3s ease;
  `;

    document.body.appendChild(notification);

    // 显示动画
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
     }
      }, 300);
    }, 3000);
  }

  public getOptions(): ScreenshotSettingsOptions {
    return { ...this.options };
  }
}