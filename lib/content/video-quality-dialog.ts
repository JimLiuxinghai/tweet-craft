import { i18nManager } from '../i18n';

interface VideoInfo {
  quality: string;
  url: string;
  size?: number;
  type: string;
  bandwidth?: number;
  resolution?: string;
}

interface TweetData {
  id: string | null;
  username: string | null;
  url: string | null;
  timestamp: number;
}

export class VideoQualityDialog {
  private dialog: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;

  /**
   * 显示视频质量选择对话框
   */
  show(videoUrls: VideoInfo[], tweetData: TweetData): Promise<VideoInfo | null> {
    return new Promise((resolve) => {
      // 如果只有一个视频选项，直接返回
      if (videoUrls.length === 1) {
        resolve(videoUrls[0]);
        return;
      }

      // 创建遮罩层
      this.createOverlay();
      
      // 创建对话框
      this.createDialog(videoUrls, tweetData, resolve);
      
      // 显示对话框
      this.showDialog();
    });
  }

  /**
   * 创建遮罩层
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'video-quality-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // 点击遮罩层关闭对话框
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide(null);
      }
    });

    document.body.appendChild(this.overlay);
  }

  /**
   * 创建对话框
   */
  private createDialog(videoUrls: VideoInfo[], tweetData: TweetData, resolve: (value: VideoInfo | null) => void): void {
    this.dialog = document.createElement('div');
    this.dialog.className = 'video-quality-dialog';
    this.dialog.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    // 对视频按质量排序
    const sortedVideos = this.sortVideosByQuality(videoUrls);

    this.dialog.innerHTML = `
      <div class="dialog-header">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1d1f23;">
          ${i18nManager.t('download_quality')}
        </h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #536471;">
          ${i18nManager.t('download_button_tooltip')}
        </p>
      </div>
      
      <div class="quality-options" style="margin-bottom: 24px;">
        ${sortedVideos.map((video, index) => `
          <label class="quality-option" style="
            display: flex;
            align-items: center;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          " data-url="${video.url}">
            <input type="radio" name="video-quality" value="${index}" style="
              margin-right: 12px;
              transform: scale(1.2);
            " ${index === 0 ? 'checked' : ''}>
            <div class="quality-info" style="flex: 1;">
              <div class="quality-label" style="
                font-weight: 600;
                color: #1d1f23;
                margin-bottom: 4px;
              ">
                ${this.getQualityLabel(video)}
              </div>
              <div class="quality-details" style="
                font-size: 12px;
                color: #536471;
              ">
                ${this.getQualityDetails(video)}
              </div>
            </div>
          </label>
        `).join('')}
      </div>
      
      <div class="dialog-actions" style="
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button class="cancel-btn" style="
          padding: 10px 20px;
          border: 1px solid #cfd9de;
          border-radius: 20px;
          background: white;
          color: #536471;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          ${i18nManager.t('cancel')}
        </button>
        <button class="download-btn" style="
          padding: 10px 20px;
          border: none;
          border-radius: 20px;
          background: #1d9bf0;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          ${i18nManager.t('download_video')}
        </button>
      </div>
    `;

    // 添加样式交互
    this.addDialogInteractions(resolve, sortedVideos);

    if (this.overlay) {
      this.overlay.appendChild(this.dialog);
    }
  }

  /**
   * 添加对话框交互
   */
  private addDialogInteractions(resolve: (value: VideoInfo | null) => void, sortedVideos: VideoInfo[]): void {
    if (!this.dialog) return;

    // 质量选项悬停效果
    const qualityOptions = this.dialog.querySelectorAll('.quality-option');
    qualityOptions.forEach(option => {
      const label = option as HTMLElement;
      
      label.addEventListener('mouseenter', () => {
        label.style.borderColor = '#1d9bf0';
        label.style.backgroundColor = '#f7f9fa';
      });
      
      label.addEventListener('mouseleave', () => {
        const radio = label.querySelector('input[type="radio"]') as HTMLInputElement;
        if (!radio.checked) {
          label.style.borderColor = '#e1e8ed';
          label.style.backgroundColor = 'white';
        }
      });

      label.addEventListener('click', () => {
        // 重置所有选项样式
        qualityOptions.forEach(opt => {
          const optElement = opt as HTMLElement;
          optElement.style.borderColor = '#e1e8ed';
          optElement.style.backgroundColor = 'white';
        });
        
        // 设置选中样式
        label.style.borderColor = '#1d9bf0';
        label.style.backgroundColor = '#f0f8ff';
      });
    });

    // 按钮事件
    const cancelBtn = this.dialog.querySelector('.cancel-btn');
    const downloadBtn = this.dialog.querySelector('.download-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hide(null);
        resolve(null);
      });

      cancelBtn.addEventListener('mouseenter', () => {
        (cancelBtn as HTMLElement).style.backgroundColor = '#f7f9fa';
      });

      cancelBtn.addEventListener('mouseleave', () => {
        (cancelBtn as HTMLElement).style.backgroundColor = 'white';
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const selectedRadio = this.dialog?.querySelector('input[name="video-quality"]:checked') as HTMLInputElement;
        if (selectedRadio) {
          const selectedIndex = parseInt(selectedRadio.value);
          const selectedVideo = sortedVideos[selectedIndex];
          this.hide(selectedVideo);
          resolve(selectedVideo);
        }
      });

      downloadBtn.addEventListener('mouseenter', () => {
        (downloadBtn as HTMLElement).style.backgroundColor = '#1a8cd8';
      });

      downloadBtn.addEventListener('mouseleave', () => {
        (downloadBtn as HTMLElement).style.backgroundColor = '#1d9bf0';
      });
    }

    // ESC键关闭
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide(null);
        resolve(null);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  /**
   * 显示对话框
   */
  private showDialog(): void {
    if (this.overlay && this.dialog) {
      // 触发动画
      requestAnimationFrame(() => {
        if (this.overlay) this.overlay.style.opacity = '1';
        if (this.dialog) this.dialog.style.transform = 'scale(1)';
      });
    }
  }

  /**
   * 隐藏对话框
   */
  private hide(result: VideoInfo | null): void {
    if (this.overlay && this.dialog) {
      this.overlay.style.opacity = '0';
      this.dialog.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.dialog = null;
      }, 300);
    }
  }

  /**
   * 按质量排序视频
   */
  private sortVideosByQuality(videos: VideoInfo[]): VideoInfo[] {
    return videos.sort((a, b) => {
      // 优先按带宽排序
      if (a.bandwidth && b.bandwidth) {
        return b.bandwidth - a.bandwidth;
      }
      
      // 按分辨率排序
      if (a.resolution && b.resolution) {
        const aPixels = this.getPixelCount(a.resolution);
        const bPixels = this.getPixelCount(b.resolution);
        return bPixels - aPixels;
      }
      
      return 0;
    });
  }

  /**
   * 获取像素数量
   */
  private getPixelCount(resolution: string): number {
    const match = resolution.match(/(\d+)x(\d+)/);
    if (match) {
      return parseInt(match[1]) * parseInt(match[2]);
    }
    return 0;
  }

  /**
   * 获取质量标签
   */
  private getQualityLabel(video: VideoInfo): string {
    if (video.resolution) {
      const pixels = this.getPixelCount(video.resolution);
      if (pixels >= 1920 * 1080) return `${video.resolution} (${i18nManager.t('download_highest_quality')})`;
      if (pixels >= 1280 * 720) return `${video.resolution} (${i18nManager.t('download_medium_quality')})`;
      return `${video.resolution} (${i18nManager.t('download_lowest_quality')})`;
    }
    
    return video.quality || i18nManager.t('download_auto_quality');
  }

  /**
   * 获取质量详情
   */
  private getQualityDetails(video: VideoInfo): string {
    const details = [];
    
    if (video.bandwidth) {
      details.push(`${Math.round(video.bandwidth / 1000)} kbps`);
    }
    
    if (video.size) {
      details.push(this.formatFileSize(video.size));
    }
    
    if (video.type) {
      details.push(video.type.split('/')[1]?.toUpperCase() || 'MP4');
    }
    
    return details.join(' • ');
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export default VideoQualityDialog;