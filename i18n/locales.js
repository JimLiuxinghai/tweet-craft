/**
 * Twitter 超级复制插件 - 国际化系统
 * 支持多语言界面和消息
 */

class I18nManager {
  constructor() {
    this.currentLocale = this.detectLocale();
    this.messages = {};
    this.fallbackLocale = 'en';
    
    // 加载语言包
    this.loadMessages();
  }

  /**
   * 检测用户语言偏好
   */
  detectLocale() {
    // 1. 检查用户设置
    const savedLocale = localStorage.getItem('superCopyLocale');
    if (savedLocale && this.isValidLocale(savedLocale)) {
      return savedLocale;
    }

    // 2. 检查Chrome扩展API
    if (chrome && chrome.i18n) {
      const chromeLocale = chrome.i18n.getUILanguage();
      const normalizedLocale = this.normalizeLocale(chromeLocale);
      if (this.isValidLocale(normalizedLocale)) {
        return normalizedLocale;
      }
    }

    // 3. 检查浏览器语言
    const browserLocale = navigator.language || navigator.userLanguage;
    const normalizedBrowser = this.normalizeLocale(browserLocale);
    if (this.isValidLocale(normalizedBrowser)) {
      return normalizedBrowser;
    }

    // 4. 检查浏览器语言列表
    if (navigator.languages) {
      for (const lang of navigator.languages) {
        const normalized = this.normalizeLocale(lang);
        if (this.isValidLocale(normalized)) {
          return normalized;
        }
      }
    }

    // 5. 默认英语
    return 'en';
  }

  /**
   * 标准化语言代码
   */
  normalizeLocale(locale) {
    if (!locale) return 'en';
    
    const normalized = locale.toLowerCase();
    
    // 处理特殊情况
    const mapping = {
      'zh-cn': 'zh-CN',
      'zh-hans': 'zh-CN', 
      'zh-tw': 'zh-TW',
      'zh-hant': 'zh-TW',
      'ja-jp': 'ja',
      'ko-kr': 'ko',
      'es-es': 'es',
      'fr-fr': 'fr'
    };

    if (mapping[normalized]) {
      return mapping[normalized];
    }

    // 提取主要语言代码
    const mainLang = normalized.split('-')[0];
    const supportedMainLangs = ['en', 'zh', 'ja', 'ko', 'es', 'fr'];
    
    if (supportedMainLangs.includes(mainLang)) {
      return mainLang === 'zh' ? 'zh-CN' : mainLang;
    }

    return 'en';
  }

  /**
   * 检查是否为有效的语言代码
   */
  isValidLocale(locale) {
    const supportedLocales = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr'];
    return supportedLocales.includes(locale);
  }

  /**
   * 获取翻译消息
   */
  getMessage(key, substitutions = {}) {
    // 尝试获取当前语言的消息
    let message = this.getMessageFromLocale(key, this.currentLocale);
    
    // 如果找不到，尝试后备语言
    if (!message && this.currentLocale !== this.fallbackLocale) {
      message = this.getMessageFromLocale(key, this.fallbackLocale);
    }

    // 如果还是找不到，返回键名
    if (!message) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }

    // 处理参数替换
    return this.substituteMessage(message, substitutions);
  }

  getMessageFromLocale(key, locale) {
    const messages = this.messages[locale];
    if (!messages) return null;
    return messages[key] || null;
  }

  substituteMessage(message, substitutions) {
    let result = message;
    Object.keys(substitutions).forEach(key => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), substitutions[key]);
    });
    return result;
  }

  async loadMessages() {
    // 硬编码的消息，避免异步加载复杂性
    this.messages = {
      'en': {
        // 按钮和界面
        'copy_tweet': 'Copy Tweet',
        'copy_thread': 'Copy Thread',
        'copy_tweet_aria': 'Copy tweet to clipboard',
        'copy_thread_aria': 'Copy tweet thread - dialog will appear',
        'copying': 'Copying...',
        'copy_success': 'Copied successfully!',
        'copy_failed': 'Copy failed',
        
        // 线程相关
        'thread_detected': '🧵 Thread Detected',
        'thread_position_info': 'This appears to be tweet {{position}} of a thread.',
        'thread_copy_question': 'Would you like to copy the entire thread?',
        'copy_entire_thread': 'Copy Entire Thread',
        'copy_this_only': 'Copy This Only',
        'cancel': 'Cancel',
        'thread_copied_success': '✅ Copied {{count}} tweet thread!',
        'thread_summary': '📊 Thread Summary: {{count}} tweets',
        
        // 格式
        'format_html': 'HTML Format',
        'format_markdown': 'Markdown Format', 
        'format_plain': 'Plain Text',
        
        // 设置
        'settings_title': 'Settings',
        'copy_format': 'Copy Format',
        'include_content': 'Include Content',
        'include_media': 'Media Information',
        'include_metrics': 'Interaction Data',
        'include_author': 'Author Information',
        'include_timestamp': 'Timestamp',
        'shortcuts': 'Shortcuts',
        'shortcut_desc': 'Quick copy current tweet',
        'copy_history': 'Copy History',
        'clear_history': 'Clear',
        'quick_actions': 'Quick Actions',
        'copy_current': 'Copy Current Tweet',
        'view_history': 'Copy History',
        
        // 错误消息
        'error_clipboard_permission': 'Copy function unavailable, please check browser permissions',
        'error_parse_failed': 'Tweet parsing failed, please try refreshing the page',
        'error_network': 'Network connection error, please check network settings',
        'error_dom_structure': 'Twitter page structure changed, plugin is adapting',
        'error_unknown': 'Plugin encountered unknown error, please try refreshing the page',
        'error_learn_more': 'Learn More',
        'error_refresh_page': 'Refresh Page',
        
        // 帮助信息
        'clipboard_help_title': 'Clipboard Permission Help',
        'clipboard_help_content': 'To enable copy function:\n\n1. Click the lock icon in address bar\n2. Find "Clipboard" permission\n3. Select "Allow"\n4. Refresh page and retry',
        
        // 语言设置
        'language': 'Language',
        'language_auto': 'Auto Detect'
      },
      
      'zh-CN': {
        // 按钮和界面
        'copy_tweet': '复制推文',
        'copy_thread': '复制线程',
        'copy_tweet_aria': '复制推文到剪贴板',
        'copy_thread_aria': '复制推文线程 - 将弹出选择对话框',
        'copying': '正在复制...',
        'copy_success': '复制成功！',
        'copy_failed': '复制失败',
        
        // 线程相关
        'thread_detected': '🧵 检测到推文线程',
        'thread_position_info': '这似乎是推文线程的第 {{position}} 条。',
        'thread_copy_question': '您想要复制整个线程吗？',
        'copy_entire_thread': '复制整个线程',
        'copy_this_only': '只复制这条',
        'cancel': '取消',
        'thread_copied_success': '✅ 已复制 {{count}} 条推文线程！',
        'thread_summary': '📊 线程总结: {{count}} 条推文',
        
        // 格式
        'format_html': 'HTML格式',
        'format_markdown': 'Markdown格式',
        'format_plain': '纯文本',
        
        // 设置
        'settings_title': '设置',
        'copy_format': '复制格式',
        'include_content': '包含内容',
        'include_media': '媒体信息',
        'include_metrics': '互动数据',
        'include_author': '作者信息',
        'include_timestamp': '发布时间',
        'shortcuts': '快捷键',
        'shortcut_desc': '快速复制当前推文',
        'copy_history': '复制历史',
        'clear_history': '清空',
        'quick_actions': '快速操作',
        'copy_current': '复制当前推文',
        'view_history': '复制历史',
        
        // 错误消息
        'error_clipboard_permission': '复制功能暂时不可用，请检查浏览器权限设置',
        'error_parse_failed': '推文解析失败，请尝试刷新页面',
        'error_network': '网络连接异常，请检查网络设置',
        'error_dom_structure': 'Twitter页面结构发生变化，插件正在适配中',
        'error_unknown': '插件遇到未知错误，请尝试刷新页面',
        'error_learn_more': '了解更多',
        'error_refresh_page': '刷新页面',
        
        // 帮助信息
        'clipboard_help_title': '剪贴板权限设置帮助',
        'clipboard_help_content': '剪贴板权限设置帮助：\n\n1. 点击地址栏左侧的锁形图标\n2. 找到"剪贴板"权限设置\n3. 选择"允许"\n4. 刷新页面后重试',
        
        // 语言设置
        'language': '语言',
        'language_auto': '自动检测'
      },
      
      'ja': {
        // 按钮和界面
        'copy_tweet': 'ツイートをコピー',
        'copy_thread': 'スレッドをコピー',
        'copy_tweet_aria': 'ツイートをクリップボードにコピー',
        'copy_thread_aria': 'ツイートスレッドをコピー - ダイアログが表示されます',
        'copying': 'コピー中...',
        'copy_success': 'コピーしました！',
        'copy_failed': 'コピーに失敗しました',
        
        // 線程相关
        'thread_detected': '🧵 スレッドを検出',
        'thread_position_info': 'これはスレッドの {{position}} 番目のツイートのようです。',
        'thread_copy_question': 'スレッド全体をコピーしますか？',
        'copy_entire_thread': 'スレッド全体をコピー',
        'copy_this_only': 'このツイートのみコピー',
        'cancel': 'キャンセル',
        'thread_copied_success': '✅ {{count}} 件のツイートスレッドをコピーしました！',
        'thread_summary': '📊 スレッド要約: {{count}} 件のツイート',
        
        // 格式
        'format_html': 'HTML形式',
        'format_markdown': 'Markdown形式',
        'format_plain': 'プレーンテキスト',
        
        // 設定
        'settings_title': '設定',
        'copy_format': 'コピー形式',
        'include_content': '含める内容',
        'include_media': 'メディア情報',
        'include_metrics': 'インタラクションデータ',
        'include_author': '作成者情報',
        'include_timestamp': 'タイムスタンプ',
        'shortcuts': 'ショートカット',
        'shortcut_desc': '現在のツイートを素早くコピー',
        'copy_history': 'コピー履歴',
        'clear_history': 'クリア',
        'quick_actions': 'クイックアクション',
        'copy_current': '現在のツイートをコピー',
        'view_history': 'コピー履歴',
        
        // エラーメッセージ
        'error_clipboard_permission': 'コピー機能が利用できません。ブラウザの権限設定を確認してください',
        'error_parse_failed': 'ツイートの解析に失敗しました。ページを更新してください',
        'error_network': 'ネットワーク接続エラーです。ネットワーク設定を確認してください',
        'error_dom_structure': 'Twitterページの構造が変更されました。プラグインが適応中です',
        'error_unknown': 'プラグインで未知のエラーが発生しました。ページを更新してください',
        'error_learn_more': '詳細',
        'error_refresh_page': 'ページを更新',
        
        // ヘルプ情報
        'clipboard_help_title': 'クリップボード権限ヘルプ',
        'clipboard_help_content': 'コピー機能を有効にするには：\n\n1. アドレスバーの錠前アイコンをクリック\n2. "クリップボード"権限を見つける\n3. "許可"を選択\n4. ページを更新して再試行',
        
        // 언어설정
        'language': '言語',
        'language_auto': '自動検出'
      },
      
      'ko': {
        // 버튼과 인터페이스
        'copy_tweet': '트윗 복사',
        'copy_thread': '스레드 복사',
        'copy_tweet_aria': '트윗을 클립보드에 복사',
        'copy_thread_aria': '트윗 스레드 복사 - 대화상자가 나타납니다',
        'copying': '복사 중...',
        'copy_success': '복사 완료!',
        'copy_failed': '복사 실패',
        
        // 스레드 관련
        'thread_detected': '🧵 스레드 감지됨',
        'thread_position_info': '이것은 스레드의 {{position}}번째 트윗인 것 같습니다.',
        'thread_copy_question': '전체 스레드를 복사하시겠습니까?',
        'copy_entire_thread': '전체 스레드 복사',
        'copy_this_only': '이것만 복사',
        'cancel': '취소',
        'thread_copied_success': '✅ {{count}}개의 트윗 스레드를 복사했습니다!',
        'thread_summary': '📊 스레드 요약: {{count}}개 트윗',
        
        // 형식
        'format_html': 'HTML 형식',
        'format_markdown': 'Markdown 형식',
        'format_plain': '일반 텍스트',
        
        // 설정
        'settings_title': '설정',
        'copy_format': '복사 형식',
        'include_content': '포함할 내용',
        'include_media': '미디어 정보',
        'include_metrics': '상호작용 데이터',
        'include_author': '작성자 정보',
        'include_timestamp': '타임스탬프',
        'shortcuts': '단축키',
        'shortcut_desc': '현재 트윗 빠르게 복사',
        'copy_history': '복사 기록',
        'clear_history': '지우기',
        'quick_actions': '빠른 작업',
        'copy_current': '현재 트윗 복사',
        'view_history': '복사 기록',
        
        // 오류 메시지
        'error_clipboard_permission': '복사 기능을 사용할 수 없습니다. 브라우저 권한 설정을 확인하세요',
        'error_parse_failed': '트윗 분석에 실패했습니다. 페이지를 새로고침 해보세요',
        'error_network': '네트워크 연결 오류입니다. 네트워크 설정을 확인하세요',
        'error_dom_structure': 'Twitter 페이지 구조가 변경되었습니다. 플러그인이 적응 중입니다',
        'error_unknown': '플러그인에서 알 수 없는 오류가 발생했습니다. 페이지를 새로고침 해보세요',
        'error_learn_more': '자세히 알아보기',
        'error_refresh_page': '페이지 새로고침',
        
        // 도움말 정보
        'clipboard_help_title': '클립보드 권한 도움말',
        'clipboard_help_content': '복사 기능을 활성화하려면:\n\n1. 주소창의 자물쇠 아이콘 클릭\n2. "클립보드" 권한 찾기\n3. "허용" 선택\n4. 페이지 새로고침 후 재시도',
        
        // 언어 설정
        'language': '언어',
        'language_auto': '자동 감지'
      },
      
      'es': {
        // Botones e interfaz
        'copy_tweet': 'Copiar Tweet',
        'copy_thread': 'Copiar Hilo',
        'copy_tweet_aria': 'Copiar tweet al portapapeles',
        'copy_thread_aria': 'Copiar hilo de tweets - aparecerá un diálogo',
        'copying': 'Copiando...',
        'copy_success': '¡Copiado con éxito!',
        'copy_failed': 'Error al copiar',
        
        // Relacionado con hilos
        'thread_detected': '🧵 Hilo Detectado',
        'thread_position_info': 'Este parece ser el tweet {{position}} de un hilo.',
        'thread_copy_question': '¿Te gustaría copiar todo el hilo?',
        'copy_entire_thread': 'Copiar Todo el Hilo',
        'copy_this_only': 'Copiar Solo Este',
        'cancel': 'Cancelar',
        'thread_copied_success': '✅ ¡Copiado hilo de {{count}} tweets!',
        'thread_summary': '📊 Resumen del hilo: {{count}} tweets',
        
        // Formato
        'format_html': 'Formato HTML',
        'format_markdown': 'Formato Markdown',
        'format_plain': 'Texto Plano',
        
        // Configuración
        'settings_title': 'Configuración',
        'copy_format': 'Formato de Copia',
        'include_content': 'Incluir Contenido',
        'include_media': 'Información de Medios',
        'include_metrics': 'Datos de Interacción',
        'include_author': 'Información del Autor',
        'include_timestamp': 'Marca de Tiempo',
        'shortcuts': 'Atajos',
        'shortcut_desc': 'Copiar rápidamente el tweet actual',
        'copy_history': 'Historial de Copia',
        'clear_history': 'Limpiar',
        'quick_actions': 'Acciones Rápidas',
        'copy_current': 'Copiar Tweet Actual',
        'view_history': 'Historial de Copia',
        
        // Mensajes de error
        'error_clipboard_permission': 'Función de copia no disponible, verifica los permisos del navegador',
        'error_parse_failed': 'Error al analizar el tweet, intenta actualizar la página',
        'error_network': 'Error de conexión de red, verifica la configuración de red',
        'error_dom_structure': 'La estructura de la página de Twitter cambió, el plugin se está adaptando',
        'error_unknown': 'El plugin encontró un error desconocido, intenta actualizar la página',
        'error_learn_more': 'Saber Más',
        'error_refresh_page': 'Actualizar Página',
        
        // Información de ayuda
        'clipboard_help_title': 'Ayuda de Permisos del Portapapeles',
        'clipboard_help_content': 'Para habilitar la función de copia:\n\n1. Haz clic en el icono de candado en la barra de direcciones\n2. Encuentra el permiso "Portapapeles"\n3. Selecciona "Permitir"\n4. Actualiza la página y vuelve a intentar',
        
        // Configuración de idioma
        'language': 'Idioma',
        'language_auto': 'Detectar Automáticamente'
      },
      
      'fr': {
        // Boutons et interface
        'copy_tweet': 'Copier le Tweet',
        'copy_thread': 'Copier le Fil',
        'copy_tweet_aria': 'Copier le tweet dans le presse-papiers',
        'copy_thread_aria': 'Copier le fil de tweets - une boîte de dialogue apparaîtra',
        'copying': 'Copie en cours...',
        'copy_success': 'Copié avec succès !',
        'copy_failed': 'Échec de la copie',
        
        // Lié aux fils
        'thread_detected': '🧵 Fil Détecté',
        'thread_position_info': 'Ceci semble être le tweet {{position}} d\'un fil.',
        'thread_copy_question': 'Souhaitez-vous copier tout le fil ?',
        'copy_entire_thread': 'Copier Tout le Fil',
        'copy_this_only': 'Copier Seulement Celui-ci',
        'cancel': 'Annuler',
        'thread_copied_success': '✅ Fil de {{count}} tweets copié !',
        'thread_summary': '📊 Résumé du fil : {{count}} tweets',
        
        // Format
        'format_html': 'Format HTML',
        'format_markdown': 'Format Markdown',
        'format_plain': 'Texte Brut',
        
        // Paramètres
        'settings_title': 'Paramètres',
        'copy_format': 'Format de Copie',
        'include_content': 'Inclure le Contenu',
        'include_media': 'Informations Média',
        'include_metrics': 'Données d\'Interaction',
        'include_author': 'Informations de l\'Auteur',
        'include_timestamp': 'Horodatage',
        'shortcuts': 'Raccourcis',
        'shortcut_desc': 'Copier rapidement le tweet actuel',
        'copy_history': 'Historique de Copie',
        'clear_history': 'Effacer',
        'quick_actions': 'Actions Rapides',
        'copy_current': 'Copier le Tweet Actuel',
        'view_history': 'Historique de Copie',
        
        // Messages d'erreur
        'error_clipboard_permission': 'Fonction de copie indisponible, vérifiez les permissions du navigateur',
        'error_parse_failed': 'Échec de l\'analyse du tweet, essayez d\'actualiser la page',
        'error_network': 'Erreur de connexion réseau, vérifiez les paramètres réseau',
        'error_dom_structure': 'La structure de la page Twitter a changé, le plugin s\'adapte',
        'error_unknown': 'Le plugin a rencontré une erreur inconnue, essayez d\'actualiser la page',
        'error_learn_more': 'En Savoir Plus',
        'error_refresh_page': 'Actualiser la Page',
        
        // Informations d'aide
        'clipboard_help_title': 'Aide sur les Permissions du Presse-papiers',
        'clipboard_help_content': 'Pour activer la fonction de copie :\n\n1. Cliquez sur l\'icône de cadenas dans la barre d\'adresse\n2. Trouvez la permission "Presse-papiers"\n3. Sélectionnez "Autoriser"\n4. Actualisez la page et réessayez',
        
        // Paramètres de langue
        'language': 'Langue',
        'language_auto': 'Détection Automatique'
      }
    };
  }

  getSupportedLocales() {
    return {
      'en': 'English',
      'zh-CN': '简体中文',
      'ja': '日本語',
      'ko': '한국어',
      'es': 'Español',
      'fr': 'Français'
    };
  }

  async setLocale(locale) {
    if (!this.isValidLocale(locale)) {
      return false;
    }
    this.currentLocale = locale;
    localStorage.setItem('superCopyLocale', locale);
    
    // 触发语言变更事件
    const event = new CustomEvent('localeChanged', {
      detail: { locale: this.currentLocale }
    });
    window.dispatchEvent(event);
    
    return true;
  }

  getCurrentLocale() {
    return this.currentLocale;
  }
}

// 创建全局实例
window.I18nManager = window.I18nManager || new I18nManager();

// 便捷函数
window.t = function(key, substitutions = {}) {
  return window.I18nManager.getMessage(key, substitutions);
}; 