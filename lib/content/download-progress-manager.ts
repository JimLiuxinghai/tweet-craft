import { i18nManager } from '../i18n';

interface DownloadProgress {
  id: number;
  filename: string;
  progress: number;
  speed?: number;
  remainingTime?: number;
  status: 'downloading' | 'completed' | 'error' | 'paused';
}

export class DownloadProgressManager {
  private progressElements: Map<number, HTMLElement> = new Map();
  private progressContainer: HTMLElement | null = null;
  private activeDownloads: Map<number, DownloadProgress> = new Map();

  constructor() {
    this.createProgressContainer();
  }

  /**
   * 创建进度显示容器
   */
  private createProgressContainer(): void {
    this.progressContainer = document.createElement('div');
    this.progressContainer.id = 'video-download-progress-container';
    this.progressContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 999998;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.progressContainer);
  }

  /**
   * 显示下载进度
   */
  showProgress(downloadId: number, filename: string): void {
    if (this.progressElements.has(downloadId)) {
      return; // 已经存在
    }

    const progressElement = document.createElement('div');
    progressElement.className = 'download-progress-item';
    progressElement.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e8ed;
      pointer-events: auto;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    progressElement.innerHTML = `
      <div class="progress-header" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      ">
        <div class="progress-icon" style="
          width: 24px;
          height: 24px;
          background: #1d9bf0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        ">📥</div>
        <button class="close-progress" style="
          background: none;
          border: none;
          color: #536471;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s ease;
        ">&times;</button>
      </div>
      
      <div class="progress-info">
        <div class="filename" style="
          font-weight: 600;
          color: #1d1f23;
          font-size: 14px;
          margin-bottom: 8px;
          word-break: break-all;
        ">${this.truncateFilename(filename)}</div>
        
        <div class="progress-bar-container" style="
          background: #f1f3f4;
          border-radius: 10px;
          height: 6px;
          margin-bottom: 8px;
          overflow: hidden;
        ">
          <div class="progress-bar-fill" style="
            background: linear-gradient(90deg, #1d9bf0, #1a8cd8);
            height: 100%;
            width: 0%;
            border-radius: 10px;
            transition: width 0.3s ease;
          "></div>
        </div>
        
        <div class="progress-details" style="
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #536471;
        ">
          <span class="progress-text">0%</span>
          <span class="progress-speed"></span>
        </div>
      </div>
    `;

    // 添加关闭按钮事件
    const closeButton = progressElement.querySelector('.close-progress');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideProgress(downloadId);
      });

      closeButton.addEventListener('mouseenter', () => {
        (closeButton as HTMLElement).style.backgroundColor = '#f7f9fa';
      });

      closeButton.addEventListener('mouseleave', () => {
        (closeButton as HTMLElement).style.backgroundColor = 'transparent';
      });
    }

    this.progressElements.set(downloadId, progressElement);
    this.activeDownloads.set(downloadId, {
      id: downloadId,
      filename,
      progress: 0,
      status: 'downloading'
    });

    if (this.progressContainer) {
      this.progressContainer.appendChild(progressElement);
      
      // 触发进入动画
      requestAnimationFrame(() => {
        progressElement.style.transform = 'translateX(0)';
      });
    }
  }

  /**
   * 更新下载进度
   */
  updateProgress(downloadId: number, progress: number, speed?: number, remainingTime?: number): void {
    const element = this.progressElements.get(downloadId);
    const downloadInfo = this.activeDownloads.get(downloadId);
    
    if (!element || !downloadInfo) return;

    // 更新数据
    downloadInfo.progress = progress;
    downloadInfo.speed = speed;
    downloadInfo.remainingTime = remainingTime;

    // 更新UI
    const progressText = element.querySelector('.progress-text');
    const progressFill = element.querySelector('.progress-bar-fill') as HTMLElement;
    const progressSpeed = element.querySelector('.progress-speed');

    if (progressText) {
      progressText.textContent = `${Math.round(progress)}%`;
    }

    if (progressFill) {
      progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    if (progressSpeed && speed) {
      const speedText = this.formatSpeed(speed);
      const timeText = remainingTime ? this.formatTime(remainingTime) : '';
      progressSpeed.textContent = timeText ? `${speedText} • ${timeText}` : speedText;
    }
  }

  /**
   * 标记下载完成
   */
  markCompleted(downloadId: number): void {
    const element = this.progressElements.get(downloadId);
    const downloadInfo = this.activeDownloads.get(downloadId);
    
    if (!element || !downloadInfo) return;

    downloadInfo.status = 'completed';

    // 更新图标和样式
    const icon = element.querySelector('.progress-icon');
    const progressText = element.querySelector('.progress-text');
    const progressFill = element.querySelector('.progress-bar-fill') as HTMLElement;

    if (icon) {
      icon.textContent = '✓';
      (icon as HTMLElement).style.background = '#00ba7c';
    }

    if (progressText) {
      progressText.textContent = i18nManager.t('download_completed');
      (progressText as HTMLElement).style.color = '#00ba7c';
    }

    if (progressFill) {
      progressFill.style.width = '100%';
      progressFill.style.background = '#00ba7c';
    }

    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideProgress(downloadId);
    }, 3000);
  }

  /**
   * 标记下载错误
   */
  markError(downloadId: number, errorMessage?: string): void {
    const element = this.progressElements.get(downloadId);
    const downloadInfo = this.activeDownloads.get(downloadId);
    
    if (!element || !downloadInfo) return;

    downloadInfo.status = 'error';

    // 更新图标和样式
    const icon = element.querySelector('.progress-icon');
    const progressText = element.querySelector('.progress-text');
    const progressFill = element.querySelector('.progress-bar-fill') as HTMLElement;

    if (icon) {
      icon.textContent = '⚠';
      (icon as HTMLElement).style.background = '#f91880';
    }

    if (progressText) {
      progressText.textContent = errorMessage || i18nManager.t('download_error');
      (progressText as HTMLElement).style.color = '#f91880';
    }

    if (progressFill) {
      progressFill.style.background = '#f91880';
    }

    // 5秒后自动隐藏
    setTimeout(() => {
      this.hideProgress(downloadId);
    }, 5000);
  }

  /**
   * 隐藏进度显示
   */
  hideProgress(downloadId: number): void {
    const element = this.progressElements.get(downloadId);
    
    if (element) {
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.progressElements.delete(downloadId);
        this.activeDownloads.delete(downloadId);
      }, 300);
    }
  }

  /**
   * 清除所有进度显示
   */
  clearAll(): void {
    this.progressElements.forEach((_, downloadId) => {
      this.hideProgress(downloadId);
    });
  }

  /**
   * 截断文件名
   */
  private truncateFilename(filename: string, maxLength: number = 30): string {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    
    return `${truncatedName}.${extension}`;
  }

  /**
   * 格式化下载速度
   */
  private formatSpeed(bytesPerSecond: number): string {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 格式化剩余时间
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s ${i18nManager.t('download_remaining_time')}`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}m ${i18nManager.t('download_remaining_time')}`;
    } else {
      const hours = Math.round(seconds / 3600);
      return `${hours}h ${i18nManager.t('download_remaining_time')}`;
    }
  }

  /**
   * 获取活跃下载数量
   */
  getActiveDownloadsCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clearAll();
    if (this.progressContainer && this.progressContainer.parentNode) {
      this.progressContainer.parentNode.removeChild(this.progressContainer);
    }
  }
}

export default DownloadProgressManager;