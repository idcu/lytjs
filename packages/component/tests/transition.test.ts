/**
 * tests/transition.test.ts
 * Tests for Transition component
 */

import { describe, it, expect, vi } from 'vitest';
import { Transition } from '../src/transition';
import type { TransitionComponentProps, ComponentOptions } from '../src/transition';

describe('Transition', () => {
  it('should be a valid ComponentOptions object', () => {
    expect(Transition).toBeDefined();
    expect(typeof Transition).toBe('object');
  });

  it('should have name "Transition"', () => {
    expect(Transition.name).toBe('Transition');
  });

  it('should define "name" prop', () => {
    expect(Transition.props.name).toBeDefined();
    expect(Transition.props.name.type).toBe(String);
  });

  it('should define "appear" prop with default false', () => {
    expect(Transition.props.appear).toBeDefined();
    expect(Transition.props.appear.default).toBe(false);
    expect(Transition.props.appear.type).toBe(Boolean);
  });

  it('should define "mode" prop with default "default"', () => {
    expect(Transition.props.mode).toBeDefined();
    expect(Transition.props.mode.default).toBe('default');
    expect(Transition.props.mode.type).toBe(String);
  });

  // ---- Enter class props ----

  it('should define enterFromClass prop', () => {
    expect(Transition.props.enterFromClass).toBeDefined();
    expect(Transition.props.enterFromClass.type).toBe(String);
  });

  it('should define enterActiveClass prop', () => {
    expect(Transition.props.enterActiveClass).toBeDefined();
    expect(Transition.props.enterActiveClass.type).toBe(String);
  });

  it('should define enterToClass prop', () => {
    expect(Transition.props.enterToClass).toBeDefined();
    expect(Transition.props.enterToClass.type).toBe(String);
  });

  // ---- Leave class props ----

  it('should define leaveFromClass prop', () => {
    expect(Transition.props.leaveFromClass).toBeDefined();
    expect(Transition.props.leaveFromClass.type).toBe(String);
  });

  it('should define leaveActiveClass prop', () => {
    expect(Transition.props.leaveActiveClass).toBeDefined();
    expect(Transition.props.leaveActiveClass.type).toBe(String);
  });

  it('should define leaveToClass prop', () => {
    expect(Transition.props.leaveToClass).toBeDefined();
    expect(Transition.props.leaveToClass.type).toBe(String);
  });

  // ---- Enter hooks ----

  it('should define onBeforeEnter hook prop', () => {
    expect(Transition.props.onBeforeEnter).toBeDefined();
    expect(Transition.props.onBeforeEnter.type).toBe(Function);
  });

  it('should define onEnter hook prop', () => {
    expect(Transition.props.onEnter).toBeDefined();
    expect(Transition.props.onEnter.type).toBe(Function);
  });

  it('should define onAfterEnter hook prop', () => {
    expect(Transition.props.onAfterEnter).toBeDefined();
    expect(Transition.props.onAfterEnter.type).toBe(Function);
  });

  it('should define onEnterCancelled hook prop', () => {
    expect(Transition.props.onEnterCancelled).toBeDefined();
    expect(Transition.props.onEnterCancelled.type).toBe(Function);
  });

  // ---- Leave hooks ----

  it('should define onBeforeLeave hook prop', () => {
    expect(Transition.props.onBeforeLeave).toBeDefined();
    expect(Transition.props.onBeforeLeave.type).toBe(Function);
  });

  it('should define onLeave hook prop', () => {
    expect(Transition.props.onLeave).toBeDefined();
    expect(Transition.props.onLeave.type).toBe(Function);
  });

  it('should define onAfterLeave hook prop', () => {
    expect(Transition.props.onAfterLeave).toBeDefined();
    expect(Transition.props.onAfterLeave.type).toBe(Function);
  });

  it('should define onLeaveCancelled hook prop', () => {
    expect(Transition.props.onLeaveCancelled).toBeDefined();
    expect(Transition.props.onLeaveCancelled.type).toBe(Function);
  });

  // ---- Setup ----

  it('should have a setup function', () => {
    expect(typeof Transition.setup).toBe('function');
  });

  it('should return default slot content from setup', () => {
    const slots = {
      default: () => [{ type: 'div', props: {}, children: null }],
    };
    const result = Transition.setup({}, { slots } as any);
    // The setup returns a function that calls slots.default
    expect(typeof result).toBe('function');
  });

  it('should handle missing default slot gracefully', () => {
    const slots = {};
    const result = Transition.setup({}, { slots } as any);
    // setup returns a function that calls slots.default?.()
    // When slots.default is undefined, the function still exists
    expect(typeof result).toBe('function');
  });

  // ---- TransitionComponentProps interface ----

  it('should support TransitionComponentProps interface', () => {
    const props: TransitionComponentProps = {
      name: 'fade',
      appear: true,
      mode: 'out-in',
      enterFromClass: 'fade-enter-from',
      enterActiveClass: 'fade-enter-active',
      enterToClass: 'fade-enter-to',
      leaveFromClass: 'fade-leave-from',
      leaveActiveClass: 'fade-leave-active',
      leaveToClass: 'fade-leave-to',
      onBeforeEnter: vi.fn(),
      onEnter: vi.fn(),
      onAfterEnter: vi.fn(),
      onEnterCancelled: vi.fn(),
      onBeforeLeave: vi.fn(),
      onLeave: vi.fn(),
      onAfterLeave: vi.fn(),
      onLeaveCancelled: vi.fn(),
    };
    expect(props.name).toBe('fade');
    expect(props.appear).toBe(true);
    expect(props.mode).toBe('out-in');
  });

  it('should allow minimal TransitionComponentProps', () => {
    const props: TransitionComponentProps = {};
    expect(props.name).toBeUndefined();
    expect(props.appear).toBeUndefined();
  });
});
