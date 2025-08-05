import {
  defaultReflectionTemplates,
  getRandomTemplate,
  getTemplatesByCategory
} from '@/lib/reflectionTemplates';

describe('Reflection Templates', () => {
  describe('defaultReflectionTemplates', () => {
    it('should have templates with required properties', () => {
      expect(defaultReflectionTemplates.length).toBeGreaterThan(0);
      
      defaultReflectionTemplates.forEach(template => {
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('content');
        expect(typeof template.title).toBe('string');
        expect(typeof template.content).toBe('string');
        expect(['funny', 'serious', 'cute']).toContain(template.category);
      });
    });

    it('should have templates for all categories', () => {
      const categories = defaultReflectionTemplates.map(t => t.category);
      expect(categories).toContain('funny');
      expect(categories).toContain('serious');
      expect(categories).toContain('cute');
    });

    it('should have non-empty content for all templates', () => {
      defaultReflectionTemplates.forEach(template => {
        expect(template.content.trim()).not.toBe('');
        expect(template.title.trim()).not.toBe('');
      });
    });
  });

  describe('getRandomTemplate', () => {
    it('should return a template from the default templates', () => {
      const randomTemplate = getRandomTemplate();
      
      expect(randomTemplate).toHaveProperty('title');
      expect(randomTemplate).toHaveProperty('category');
      expect(randomTemplate).toHaveProperty('content');
      
      const isInDefaults = defaultReflectionTemplates.some(
        template => template.title === randomTemplate.title
      );
      expect(isInDefaults).toBe(true);
    });

    it('should return different templates on multiple calls (eventually)', () => {
      const templates = new Set();
      
      // Call multiple times to increase chance of getting different templates
      for (let i = 0; i < 20; i++) {
        const template = getRandomTemplate();
        templates.add(template.title);
      }
      
      // If we have more than one template, we should eventually get different ones
      if (defaultReflectionTemplates.length > 1) {
        expect(templates.size).toBeGreaterThan(1);
      }
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return only templates of the specified category', () => {
      const funnyTemplates = getTemplatesByCategory('funny');
      const seriousTemplates = getTemplatesByCategory('serious');
      const cuteTemplates = getTemplatesByCategory('cute');
      
      funnyTemplates.forEach(template => {
        expect(template.category).toBe('funny');
      });
      
      seriousTemplates.forEach(template => {
        expect(template.category).toBe('serious');
      });
      
      cuteTemplates.forEach(template => {
        expect(template.category).toBe('cute');
      });
    });

    it('should return at least one template for each category', () => {
      expect(getTemplatesByCategory('funny').length).toBeGreaterThan(0);
      expect(getTemplatesByCategory('serious').length).toBeGreaterThan(0);
      expect(getTemplatesByCategory('cute').length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid category', () => {
      // TypeScript should prevent this, but testing runtime behavior
      const invalidTemplates = getTemplatesByCategory('invalid' as 'funny');
      expect(invalidTemplates).toEqual([]);
    });

    it('should return all templates when combining categories', () => {
      const funnyTemplates = getTemplatesByCategory('funny');
      const seriousTemplates = getTemplatesByCategory('serious');
      const cuteTemplates = getTemplatesByCategory('cute');
      
      const totalFromCategories = funnyTemplates.length + seriousTemplates.length + cuteTemplates.length;
      expect(totalFromCategories).toBe(defaultReflectionTemplates.length);
    });
  });

  describe('template content validation', () => {
    it('should have templates with placeholder text for customization', () => {
      const hasPlaceholders = defaultReflectionTemplates.some(template => 
        template.content.includes('[이름]') || 
        template.content.includes('[날짜]') ||
        template.content.includes('[목표횟수]') ||
        template.content.includes('[달성횟수]')
      );
      
      expect(hasPlaceholders).toBe(true);
    });

    it('should have varied template lengths', () => {
      const lengths = defaultReflectionTemplates.map(t => t.content.length);
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      
      // Templates should have some variety in length
      expect(maxLength - minLength).toBeGreaterThan(100);
    });

    it('should have Korean content', () => {
      defaultReflectionTemplates.forEach(template => {
        // Check for Korean characters (Hangul)
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(template.content);
        expect(hasKorean).toBe(true);
      });
    });
  });
});
