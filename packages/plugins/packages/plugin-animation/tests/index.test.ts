import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAnimation, PRESETS, createAnimationManager } from '../src';

describe('@lytjs/plugin-animation', () => {
  describe('createAnimation', () => {
    it('should create an animation instance', () => {
      const animateFn = vi.fn();
      const animation = createAnimation(animateFn);

      expect(animation).toBeDefined();
      expect(animation.play).toBeDefined();
      expect(animation.pause).toBeDefined();
      expect(animation.cancel).toBeDefined();
      expect(animation.reset).toBeDefined();
      expect(animation.seek).toBeDefined();
      expect(animation.reverse).toBeDefined();
    });

    it('should call animateFn with progress', () => {
      vi.useFakeTimers();

      const animateFn = vi.fn();
      const animation = createAnimation(animateFn, {
        duration: 100,
        easing: 'linear',
      });

      animation.play();

      vi.advanceTimersByTime(150);
      expect(animateFn).toHaveBeenCalled();
    });

    it('should support custom easing function', () => {
      vi.useFakeTimers();

      const customEasing = vi.fn((t) => t * t);
      const animateFn = vi.fn();
      const animation = createAnimation(animateFn, {
        duration: 100,
        easing: customEasing,
      });

      animation.play();
      vi.advanceTimersByTime(150);

      expect(customEasing).toHaveBeenCalled();
    });

    it('should call onComplete when animation finishes', () => {
      vi.useFakeTimers();

      const animateFn = vi.fn();
      const onComplete = vi.fn();
      const animation = createAnimation(animateFn, {
        duration: 100,
        onComplete,
      });

      animation.play();
      vi.advanceTimersByTime(150);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should pause and resume animation', () => {
      const animateFn = vi.fn();
      const onPause = vi.fn();
      const animation = createAnimation(animateFn, {
        duration: 100,
        onPause,
      });

      animation.play();
      expect(animation.state).toBe('playing');

      animation.pause();
      expect(animation.state).toBe('paused');
      expect(onPause).toHaveBeenCalled();

      animation.play();
      expect(animation.state).toBe('playing');
    });

    it('should cancel animation', () => {
      const animateFn = vi.fn();
      const onCancel = vi.fn();
      const animation = createAnimation(animateFn, {
        duration: 100,
        onCancel,
      });

      animation.play();
      animation.cancel();

      expect(animation.state).toBe('cancelled');
      expect(onCancel).toHaveBeenCalled();
    });

    it('should reset animation', () => {
      const animateFn = vi.fn();
      const animation = createAnimation(animateFn, { duration: 100 });

      animation.play();
      animation.reset();

      expect(animation.state).toBe('idle');
      expect(animation.progress).toBe(0);
    });

    it('should seek to specific progress', () => {
      const animateFn = vi.fn();
      const animation = createAnimation(animateFn, { duration: 100 });

      animation.seek(0.5);

      expect(animation.progress).toBe(0.5);
      expect(animateFn).toHaveBeenCalled();
    });
  });

  describe('PRESETS', () => {
    it('should have common animation presets', () => {
      expect(PRESETS.fadeIn).toBeDefined();
      expect(PRESETS.fadeOut).toBeDefined();
      expect(PRESETS.slideInUp).toBeDefined();
      expect(PRESETS.slideInDown).toBeDefined();
      expect(PRESETS.zoomIn).toBeDefined();
      expect(PRESETS.zoomOut).toBeDefined();
      expect(PRESETS.bounceIn).toBeDefined();
      expect(PRESETS.shake).toBeDefined();
    });
  });

  describe('createAnimationManager', () => {
    it('should create an animation manager', () => {
      const manager = createAnimationManager();
      expect(manager).toBeDefined();
      expect(manager.animate).toBeDefined();
      expect(manager.applyPreset).toBeDefined();
      expect(manager.transitionElement).toBeDefined();
      expect(manager.remove).toBeDefined();
      expect(manager.clear).toBeDefined();
    });

    it('should create animations through manager', () => {
      const manager = createAnimationManager();
      const animateFn = vi.fn();

      const animation = manager.animate(animateFn, { duration: 100 });

      expect(animation).toBeDefined();
    });

    it('should track and clear animations', () => {
      const manager = createAnimationManager();
      const animateFn = vi.fn();

      const animation1 = manager.animate(animateFn);
      const animation2 = manager.animate(animateFn);

      expect(animation1).toBeDefined();
      expect(animation2).toBeDefined();

      manager.remove(animation1.id);
      manager.clear();
    });
  });
});
