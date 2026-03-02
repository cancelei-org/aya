/**
 * Question Generation Engine for Requirements Refinement
 * 
 * ⚠️ TEMPORARILY DISABLED - 一時的に無効化中
 * 
 * 現在の実装：
 * - 定型の質問文から選択して表示
 * - 既存の要件内容を分析して重複を避ける
 * - 言語別（日本語/英語）の質問セット
 * 
 * 今後の改善予定：
 * - AIベースの動的な質問生成機能を実装
 * - ユーザーの回答に基づいた適応的な質問
 * - より自然な対話フローの実現
 * - コンテキストを理解した深掘り質問
 * 
 * 実装予定時期：未定
 * 関連Issue：#TBD
 * 
 * この機能を有効化するには：
 * 1. components/chat/ChatPanelLogic.tsx のインポートのコメントアウトを解除
 * 2. 質問生成処理のコメントアウトを解除
 * 3. pendingQuestionsステートのコメントアウトを解除
 */

// Question generation engine for requirements refinement
import { AIQuestion } from '@/types/requirements';

// Question category types
export type QuestionCategory =
  | 'use_case_clarification'
  | 'reference_products'
  | 'feature_definition'
  | 'user_constraints'
  | 'technical_preferences';

interface QuestionContext {
  existingRequirements: string;
  sectionType:
  | 'hardware'
  | 'software'
  | 'interface'
  | 'performance'
  | 'constraints';
  completenessScore: number;
  previousAnswers?: Map<string, string>;
  detectedDomain?: string;
}

interface CategoryQuestion {
  question: string;
  intent: string;
  exampleAnswers: string[];
  followUpQuestions?: string[];
}

// Question categories in Japanese
const QUESTION_CATEGORIES_JA: Record<
  QuestionCategory,
  {
    priority: number;
    questions: CategoryQuestion[];
  }
> = {
  use_case_clarification: {
    priority: 1,
    questions: [
      {
        question: '誰がこのシステムを使いますか？',
        intent: 'To identify the target users and their needs',
        exampleAnswers: [
          '工場の作業員が日常的に使用',
          '家庭のユーザーが必要な時だけ使用',
          '研究者が実験で使用',
        ],
      },
      {
        question: 'どんな場面・環境で使用されますか？',
        intent:
          'To understand the usage context and environmental requirements',
        exampleAnswers: [
          '屋外の建設現場で使用',
          'オフィスのデスク上で使用',
          '移動しながら使用',
        ],
      },
      {
        question: 'このシステムで解決したい具体的な問題は何ですか？',
        intent: 'To clarify the core problem the system should solve',
        exampleAnswers: [
          '温度の異常を素早く検知して事故を防ぎたい',
          '手作業のミスを減らして効率を上げたい',
          '離れた場所から状況を確認したい',
        ],
      },
      {
        question: '使用頻度はどのくらいですか？',
        intent: 'To determine durability and maintenance requirements',
        exampleAnswers: [
          '24時間365日連続稼働',
          '1日に数回程度',
          '緊急時のみ（月に1-2回）',
        ],
      },
    ],
  },

  reference_products: {
    priority: 2,
    questions: [
      {
        question: '参考にしている既存製品や類似システムはありますか？',
        intent: 'To understand the baseline expectations and features',
        exampleAnswers: [
          'Nest Thermostatのような学習機能付き温度計',
          'Arduinoベースの既存のDIYプロジェクト',
          '市販の○○製品',
        ],
      },
      {
        question: 'その製品の良い点は何ですか？',
        intent: 'To identify features that should be retained or improved',
        exampleAnswers: ['操作が簡単で直感的', '価格が手頃', '信頼性が高い'],
      },
      {
        question: '改善したい点や追加したい機能は何ですか？',
        intent: 'To identify unique value propositions and differentiators',
        exampleAnswers: [
          'もっと長時間バッテリーで動作させたい',
          'スマートフォンから操作できるようにしたい',
          'より正確な測定ができるようにしたい',
        ],
      },
    ],
  },

  feature_definition: {
    priority: 3,
    questions: [
      {
        question: '必須の機能を3つ挙げてください',
        intent: 'To prioritize core functionality for MVP',
        exampleAnswers: [
          '1. リアルタイムモニタリング 2. アラート通知 3. データログ',
          '1. 自動制御 2. 手動オーバーライド 3. 状態表示',
          '1. 測定 2. 記録 3. 分析',
        ],
      },
      {
        question: 'ユーザーはどのようにシステムを操作しますか？',
        intent: 'To determine the user interface requirements',
        exampleAnswers: [
          '物理的なボタンとLEDインジケーター',
          'スマートフォンアプリから操作',
          '音声コマンドで操作',
          'タッチスクリーンで操作',
        ],
      },
      {
        question: '結果をどのように確認しますか？',
        intent: 'To determine output and feedback mechanisms',
        exampleAnswers: [
          'LCD画面に数値を表示',
          'スマートフォンに通知を送信',
          'クラウドダッシュボードで確認',
          '音や光で知らせる',
        ],
      },
    ],
  },

  user_constraints: {
    priority: 4,
    questions: [
      {
        question: '予算の目安はありますか？',
        intent: 'To select appropriate components within budget constraints',
        exampleAnswers: [
          '5,000円以内で作りたい',
          '1-2万円程度なら問題ない',
          '性能重視で予算は柔軟',
        ],
      },
      {
        question: 'サイズや重量の制限はありますか？',
        intent: 'To determine form factor and component selection constraints',
        exampleAnswers: [
          '手のひらサイズ（10cm x 10cm以内）',
          'ポケットに入るサイズ',
          'サイズは問わない',
        ],
      },
      {
        question: 'デザインや見た目で重要な点はありますか？',
        intent: 'To understand aesthetic and user experience requirements',
        exampleAnswers: [
          'プロフェッショナルな外観が必要',
          '機能性重視で見た目は気にしない',
          '子供でも使いやすいカラフルなデザイン',
        ],
      },
    ],
  },

  technical_preferences: {
    priority: 5,
    questions: [
      {
        question: '使いたい部品やプラットフォームはありますか？',
        intent: 'To leverage existing components and user familiarity',
        exampleAnswers: [
          'Arduino Unoを使いたい',
          'Raspberry Piで作りたい',
          '特にこだわりはない',
        ],
      },
      {
        question: '既に持っている部品で活用したいものはありますか？',
        intent: 'To reduce cost and utilize available resources',
        exampleAnswers: [
          'ESP32とセンサーモジュールを持っている',
          '3Dプリンターがあるので筐体は自作可能',
          '特になし',
        ],
      },
    ],
  },
};

// Question categories in English
const QUESTION_CATEGORIES_EN: Record<
  QuestionCategory,
  {
    priority: number;
    questions: CategoryQuestion[];
  }
> = {
  use_case_clarification: {
    priority: 1,
    questions: [
      {
        question: 'Who will use this system?',
        intent: 'To identify the target users and their needs',
        exampleAnswers: [
          'Factory workers for daily use',
          'Home users on an as-needed basis',
          'Researchers for experiments',
        ],
      },
      {
        question: 'In what scenarios and environments will it be used?',
        intent: 'To understand the usage context and environmental requirements',
        exampleAnswers: [
          'Outdoor construction sites',
          'Office desktop use',
          'Mobile use while moving',
        ],
      },
      {
        question: 'What specific problem do you want to solve with this system?',
        intent: 'To clarify the core problem the system should solve',
        exampleAnswers: [
          'Quickly detect// temperature anomalies to prevent accidents',
          'Reduce manual errors and improve efficiency',
          'Monitor situations from remote locations',
        ],
      },
      {
        question: 'How frequently will it be used?',
        intent: 'To determine durability and maintenance requirements',
        exampleAnswers: [
          '24/7 continuous operation',
          'Several times per day',
          'Emergency use only (1-2 times per month)',
        ],
      },
    ],
  },

  reference_products: {
    priority: 2,
    questions: [
      {
        question: 'Are there any existing products or similar systems you are referencing?',
        intent: 'To understand the baseline expectations and features',
        exampleAnswers: [
          'Learning-enabled thermometer like Nest Thermostat',
          'Existing Arduino-based DIY projects',
          'Commercial product XYZ',
        ],
      },
      {
        question: 'What are the good points of that product?',
        intent: 'To identify features that should be retained or improved',
        exampleAnswers: ['Easy and intuitive operation', 'Affordable price', 'High reliability'],
      },
      {
        question: 'What would you like to improve or add?',
        intent: 'To identify unique value propositions and differentiators',
        exampleAnswers: [
          'Longer battery life',
          'Smartphone control capability',
          'More accurate measurements',
        ],
      },
    ],
  },

  feature_definition: {
    priority: 3,
    questions: [
      {
        question: 'Please list 3 essential features',
        intent: 'To prioritize core functionality for MVP',
        exampleAnswers: [
          '1. Real-time monitoring 2. Alert notifications 3. Data logging',
          '1. Automatic control 2. Manual override 3. Status display',
          '1. Measurement 2. Recording 3. Analysis',
        ],
      },
      {
        question: 'How will users operate the system?',
        intent: 'To determine the user interface requirements',
        exampleAnswers: [
          'Physical buttons and LED indicators',
          'Smartphone app control',
          'Voice commands',
          'Touchscreen interface',
        ],
      },
      {
        question: 'How will results be viewed?',
        intent: 'To determine output and feedback mechanisms',
        exampleAnswers: [
          'LCD display showing values',
          'Smartphone notifications',
          'Cloud dashboard',
          'Audio or visual alerts',
        ],
      },
    ],
  },

  user_constraints: {
    priority: 4,
    questions: [
      {
        question: 'What is your budget estimate?',
        intent: 'To select appropriate components within budget constraints',
        exampleAnswers: [
          'Under $50',
          '$100-200 is acceptable',
          'Performance-focused, flexible budget',
        ],
      },
      {
        question: 'Are there any size or weight limitations?',
        intent: 'To determine form factor and component selection constraints',
        exampleAnswers: [
          'Palm-sized (within 10cm x 10cm)',
          'Pocket-sized',
          'No size restrictions',
        ],
      },
      {
        question: 'Are there any important design or aesthetic considerations?',
        intent: 'To understand aesthetic and user experience requirements',
        exampleAnswers: [
          'Professional appearance required',
          'Function over form',
          'Child-friendly colorful design',
        ],
      },
    ],
  },

  technical_preferences: {
    priority: 5,
    questions: [
      {
        question: 'Do you have any preferred components or platforms?',
        intent: 'To leverage existing components and user familiarity',
        exampleAnswers: [
          'Want to use Arduino Uno',
          'Prefer Raspberry Pi',
          'No particular preference',
        ],
      },
      {
        question: 'Do you have any existing components you would like to use?',
        intent: 'To reduce cost and utilize available resources',
        exampleAnswers: [
          'Have ESP32 and sensor modules',
          'Have 3D printer for custom enclosures',
          'None',
        ],
      },
    ],
  },
};

export class QuestionGenerationEngine {
  private language: 'ja' | 'en' = 'ja';

  constructor(language: 'ja' | 'en' = 'ja') {
    this.language = language;
  }
  // Analyze existing content to extract already defined information
  private analyzeExistingContent(content: string): Map<string, boolean> {
    const definedInfo = new Map<string, boolean>();
    const lowerContent = content.toLowerCase();

    // Check for// temperature information
    if (/温度|temperature|\d+°c|\d+度|\d+℃/.test(lowerContent)) {
      definedInfo.set('temperature_range', true);
      console.log('🔍 Found// temperature information in existing content');
    }

    // Check for user information
    if (/ユーザー|使用者|誰が|who|user/.test(lowerContent)) {
      definedInfo.set('target_user', true);
    }

    // Check for usage environment
    if (/環境|場所|屋外|屋内|environment|indoor|outdoor/.test(lowerContent)) {
      definedInfo.set('usage_environment', true);
    }

    // Check for budget information
    if (/予算|コスト|円|budget|cost|price/.test(lowerContent)) {
      definedInfo.set('budget', true);
    }

    // Check for size constraints
    if (/サイズ|大きさ|寸法|size|dimension/.test(lowerContent)) {
      definedInfo.set('size_constraint', true);
    }

    // Check for existing product references
    if (
      /製品|商品|のような|似た|類似|like|similar|product/.test(lowerContent)
    ) {
      definedInfo.set('reference_product', true);
    }

    // Check for core functionality
    if (/機能|動作|できる|feature|function/.test(lowerContent)) {
      definedInfo.set('core_features', true);
    }

    // Check for platform preference
    if (
      /arduino|raspberry|esp32|プラットフォーム|platform/.test(lowerContent)
    ) {
      definedInfo.set('platform_preference', true);
    }

    return definedInfo;
  }

  // Check if a specific question should be asked based on existing content
  private shouldAskQuestion(
    question: CategoryQuestion,
    definedInfo: Map<string, boolean>,
  ): boolean {
    const questionLower = question.question.toLowerCase();

    // Skip// temperature-related questions if// temperature is already defined
    if (
      definedInfo.get('temperature_range') &&
      (questionLower.includes('温度') || questionLower.includes('temperature'))
    ) {
      console.log(
        `⏭️ Skipping question about// temperature: ${question.question}`,
      );
      return false;
    }

    // Skip user-related questions if user is already defined
    if (
      definedInfo.get('target_user') &&
      (questionLower.includes('誰が') || questionLower.includes('ユーザー'))
    ) {
      console.log(`⏭️ Skipping question about users: ${question.question}`);
      return false;
    }

    // Skip environment questions if already defined
    if (
      definedInfo.get('usage_environment') &&
      (questionLower.includes('環境') || questionLower.includes('場面'))
    ) {
      console.log(
        `⏭️ Skipping question about environment: ${question.question}`,
      );
      return false;
    }

    // Skip budget questions if already defined
    if (
      definedInfo.get('budget') &&
      (questionLower.includes('予算') || questionLower.includes('budget'))
    ) {
      console.log(`⏭️ Skipping question about budget: ${question.question}`);
      return false;
    }

    // Skip size questions if already defined
    if (
      definedInfo.get('size_constraint') &&
      (questionLower.includes('サイズ') || questionLower.includes('重量'))
    ) {
      console.log(`⏭️ Skipping question about size: ${question.question}`);
      return false;
    }

    // Skip platform questions if already defined
    if (
      definedInfo.get('platform_preference') &&
      (questionLower.includes('部品') ||
        questionLower.includes('プラットフォーム'))
    ) {
      console.log(`⏭️ Skipping question about platform: ${question.question}`);
      return false;
    }

    return true;
  }

  private hasUseCaseClarity(content: string): boolean {
    const lowerReq = content.toLowerCase();
    const clarityKeywords = [
      '使用',
      'ユーザー',
      '目的',
      '解決',
      '問題',
      'who',
      'what',
      'why',
      'user',
      'purpose',
    ];
    return clarityKeywords.some((keyword) => lowerReq.includes(keyword));
  }

  private mentionsExistingProducts(context: QuestionContext): boolean {
    const lowerReq = context.existingRequirements.toLowerCase();
    const productKeywords = [
      '製品',
      '商品',
      'のような',
      '似た',
      '類似',
      'like',
      'similar',
      'product',
      'existing',
    ];
    return productKeywords.some((keyword) => lowerReq.includes(keyword));
  }

  private hasBasicPurpose(context: QuestionContext): boolean {
    return (
      context.completenessScore > 30 ||
      this.hasUseCaseClarity(context.existingRequirements)
    );
  }

  private selectQuestionsFromCategory(
    category: QuestionCategory,
    definedInfo: Map<string, boolean>,
  ): AIQuestion[] {
    const QUESTION_CATEGORIES = this.language === 'ja' ? QUESTION_CATEGORIES_JA : QUESTION_CATEGORIES_EN;
    const categoryData = QUESTION_CATEGORIES[category];
    return categoryData.questions
      .filter((q) => this.shouldAskQuestion(q, definedInfo))
      .map((q, index) => ({
        id: `${category}_${index + 1}`,
        question: q.question,
        intent: q.intent,
        exampleAnswers: q.exampleAnswers,
        priority: categoryData.priority,
        answered: false,
      }));
  }

  generateQuestions(context: QuestionContext): AIQuestion[] {
    console.log('🤖 Generating questions with context:', {
      completenessScore: context.completenessScore,
      contentLength: context.existingRequirements.length,
      hasPreviousAnswers: !!context.previousAnswers,
    });

    // Analyze existing content to avoid duplicate questions
    const definedInfo = this.analyzeExistingContent(
      context.existingRequirements,
    );
    console.log(
      '📊 Analyzed existing content, found info:',
      Array.from(definedInfo.entries()),
    );

    const questions: AIQuestion[] = [];

    // If completeness is very low, start with basic use case questions
    if (
      context.completenessScore < 30 &&
      !this.hasUseCaseClarity(context.existingRequirements)
    ) {
      const useCaseQuestions = this.selectQuestionsFromCategory(
        'use_case_clarification',
        definedInfo,
      );
      questions.push(...useCaseQuestions.slice(0, 3));
      if (questions.length === 0) {
        console.log(
          '⚠️ All use case questions already answered, moving to next category',
        );
      }
    }

    // If existing products are mentioned, dive deeper
    if (this.mentionsExistingProducts(context) && questions.length < 5) {
      const refQuestions = this.selectQuestionsFromCategory(
        'reference_products',
        definedInfo,
      );
      questions.push(...refQuestions.slice(0, 2));
    }

    // If we have basic purpose, ask about features
    if (this.hasBasicPurpose(context) && questions.length < 5) {
      const featureQuestions = this.selectQuestionsFromCategory(
        'feature_definition',
        definedInfo,
      );
      questions.push(...featureQuestions.slice(0, 2));
    }

    // Always include at least one constraint question
    if (questions.length < 4) {
      const constraintQuestions = this.selectQuestionsFromCategory(
        'user_constraints',
        definedInfo,
      );
      questions.push(...constraintQuestions.slice(0, 1));
    }

    // Add technical preferences if there's room
    if (questions.length < 5) {
      const techQuestions = this.selectQuestionsFromCategory(
        'technical_preferences',
        definedInfo,
      );
      questions.push(...techQuestions.slice(0, 1));
    }

    // If no questions were generated (all info already exists), generate advanced questions
    if (questions.length === 0) {
      console.log(
        '🎯 All basic info already defined, generating advanced questions',
      );
      questions.push({
        id: 'advanced_1',
        question: '現在の要件で不明確な点や詳細化が必要な部分はありますか？',
        intent: 'To identify areas that need further clarification',
        exampleAnswers: [
          '温度センサーの精度をもっと高くしたい',
          '通信方式の詳細を決めたい',
        ],
        priority: 1,
        answered: false,
      });
    }

    console.log(`✅ Generated ${questions.length} non-duplicate questions`);

    // Sort by priority and return top 5
    return questions.sort((a, b) => a.priority - b.priority).slice(0, 5);
  }

  generateFollowUpQuestion(previousAnswer: string): AIQuestion | null {
    const lowerAnswer = previousAnswer.toLowerCase();

    // Follow-up for use case answers
    if (lowerAnswer.includes('工場') || lowerAnswer.includes('factory')) {
      return {
        id: 'followup_industrial',
        question: '工場のどの工程で使用しますか？安全規格の要求はありますか？',
        intent:
          'To understand specific industrial requirements and compliance needs',
        exampleAnswers: [
          '組立ライン、CE規格準拠が必要',
          '検査工程、特に規格要求なし',
        ],
        priority: 1,
        answered: false,
      };
    }

    // Follow-up for budget answers
    if (lowerAnswer.includes('円') || lowerAnswer.includes('budget')) {
      const budgetMatch = lowerAnswer.match(/(\d+)/)?.[0];
      if (budgetMatch && parseInt(budgetMatch) < 10000) {
        return {
          id: 'followup_lowbudget',
          question: '低予算での実現のため、どの機能を優先しますか？',
          intent: 'To prioritize features within budget constraints',
          exampleAnswers: ['基本機能のみでOK', '精度は落としても全機能必要'],
          priority: 1,
          answered: false,
        };
      }
    }

    // Follow-up for platform preference
    if (lowerAnswer.includes('arduino') || lowerAnswer.includes('raspberry')) {
      return {
        id: 'followup_platform',
        question:
          'そのプラットフォームを選んだ理由は何ですか？プログラミング経験はありますか？',
        intent: 'To understand technical skill level and platform requirements',
        exampleAnswers: [
          '使い慣れている、C++経験あり',
          '入門書を持っている、初心者',
        ],
        priority: 1,
        answered: false,
      };
    }

    return null;
  }

  // Infer technical specifications from user requirements
  inferTechnicalSpecs(userAnswers: Map<string, string>): {
    powerRequirements: {
      type: string;
      voltage: string;
      current?: string;
      batteryLife?: string;
    };
    environmentalSpecs: {
      // temperature: string;
      protection: string;
      humidity: string;
      vibration?: string;
    };
    communicationSpecs: Array<{ type: string; protocol: string }>;
    processingRequirements: { level: string; suggestion: string };
  } {
    const specs = {
      powerRequirements: this.inferPowerSpecs(userAnswers),
      environmentalSpecs: this.inferEnvironmentalSpecs(userAnswers),
      communicationSpecs: this.inferCommunicationSpecs(userAnswers),
      processingRequirements: this.inferProcessingSpecs(userAnswers),
    };

    return specs;
  }

  private inferPowerSpecs(answers: Map<string, string>): {
    type: string;
    voltage: string;
    current?: string;
    batteryLife?: string;
  } {
    const usage = answers.get('usage_frequency') || '';
    const environment = answers.get('environment') || '';

    if (usage.includes('24時間') || usage.includes('連続')) {
      return { type: 'mains_powered', voltage: '5-12V', current: '500mA-2A' };
    } else if (environment.includes('屋外') || environment.includes('移動')) {
      return { type: 'battery', voltage: '3.3-5V', batteryLife: '1+ months' };
    }

    return { type: 'flexible', voltage: '3.3-12V' };
  }

  private inferEnvironmentalSpecs(answers: Map<string, string>): {
    // temperature: string;
    protection: string;
    humidity: string;
    vibration?: string;
  } {
    const environment = answers.get('environment') || '';

    if (environment.includes('屋外') || environment.includes('outdoor')) {
      return {
        // temperature: '-20 to 60°C',
        protection: 'IP65',
        humidity: '0-95% RH',
      };
    } else if (
      environment.includes('工場') ||
      environment.includes('industrial')
    ) {
      return {
        // temperature: '-10 to 50°C',
        protection: 'IP54',
        vibration: 'Industrial grade',
      };
    }

    return {
      // temperature: '0 to 40°C',
      protection: 'IP20',
      humidity: '20-80% RH',
    };
  }

  private inferCommunicationSpecs(
    answers: Map<string, string>,
  ): Array<{ type: string; protocol: string }> {
    const control = answers.get('control_method') || '';
    const output = answers.get('output_method') || '';

    const specs = [];

    if (control.includes('スマートフォン') || output.includes('アプリ')) {
      specs.push({ type: 'wireless', protocol: 'WiFi or Bluetooth' });
    }
    if (control.includes('PC') || output.includes('PC')) {
      specs.push({ type: 'wired', protocol: 'USB or Serial' });
    }
    if (output.includes('クラウド')) {
      specs.push({ type: 'internet', protocol: 'WiFi with MQTT/HTTP' });
    }

    return specs.length > 0
      ? specs
      : [{ type: 'standalone', protocol: 'none' }];
  }

  private inferProcessingSpecs(answers: Map<string, string>): {
    level: string;
    suggestion: string;
  } {
    const features = answers.get('required_features') || '';

    if (
      features.includes('AI') ||
      features.includes('画像') ||
      features.includes('学習')
    ) {
      return { level: 'high', suggestion: 'Raspberry Pi 4 or Jetson Nano' };
    } else if (features.includes('リアルタイム') || features.includes('制御')) {
      return { level: 'medium', suggestion: 'ESP32 or STM32' };
    }

    return { level: 'low', suggestion: 'Arduino Uno or ESP8266' };
  }

  private analyzeCompleteness(requirements: string): Map<string, number> {
    const sectionScores = new Map<string, number>();
    const sections = [
      {
        key: 'purpose',
        keywords: ['目的', '用途', '解決', 'purpose', 'use', 'solve'],
        weight: 1.5,
      },
      {
        key: 'users',
        keywords: ['ユーザー', '使用者', '誰が', 'user', 'who'],
        weight: 1.2,
      },
      {
        key: 'features',
        keywords: ['機能', '動作', 'できる', 'feature', 'function'],
        weight: 1.5,
      },
      {
        key: 'constraints',
        keywords: ['制約', '予算', 'サイズ', 'constraint', 'budget', 'size'],
        weight: 1.0,
      },
      {
        key: 'interface',
        keywords: ['操作', '表示', '通知', 'interface', 'display', 'control'],
        weight: 1.0,
      },
    ];

    sections.forEach((section) => {
      let score = 0;
      section.keywords.forEach((keyword) => {
        if (requirements.toLowerCase().includes(keyword)) {
          score += section.weight;
        }
      });
      sectionScores.set(section.key, Math.min(score * 20, 100));
    });

    return sectionScores;
  }

  validateRequirements(requirements: string): {
    isValid: boolean;
    missingCritical: string[];
    suggestions: string[];
  } {
    const missingCritical: string[] = [];
    const suggestions: string[] = [];

    // Check for use case clarity
    if (!this.hasUseCaseClarity(requirements)) {
      missingCritical.push('使用目的・ユーザーの明確化');
      suggestions.push(
        '誰が、どんな場面で、何のために使うかを明確にしてください',
      );
    }

    // Check for feature definition
    const hasFeatures = ['機能', '動作', 'できる', 'feature', 'function'].some(
      (keyword) => requirements.toLowerCase().includes(keyword),
    );
    if (!hasFeatures) {
      missingCritical.push('必要な機能の定義');
      suggestions.push('システムが実現すべき機能を具体的に記述してください');
    }

    // Check for success criteria
    const hasSuccess = [
      '成功',
      '完了',
      '基準',
      'success',
      'criteria',
      'complete',
    ].some((keyword) => requirements.toLowerCase().includes(keyword));
    if (!hasSuccess) {
      suggestions.push('どうなったら成功かの基準を追加することをお勧めします');
    }

    return {
      isValid: missingCritical.length === 0,
      missingCritical,
      suggestions,
    };
  }
}
