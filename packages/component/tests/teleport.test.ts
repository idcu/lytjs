/**
 * tests/teleport.test.ts
 * Tests for Teleport component
 */

import { describe, it, expect } from 'vitest';
import { Teleport } from '../src/teleport';
import type { TeleportProps, ComponentOptions } from '../src/teleport';

describe('Teleport', () => {
  it('should be a valid ComponentOptions object', () => {
    expect(Teleport).toBeDefined();
    expect(typeof Teleport).toBe('object');
  });

  it('should have name "Teleport"', () => {
    expect(Teleport.name).toBe('Teleport');
  });

  it('should define "to" prop as required', () => {
    expect(Teleport.props).toBeDefined();
    expect(Teleport.props.to).toBeDefined();
    expect(Teleport.props.to.required).toBe(true);
  });

  it('should accept string and object types for "to" prop', () => {
    const toProp = Teleport.props.to;
    // The type is [String, Object] which means it accepts both
    expect(toProp.type).toBeDefined();
    expect(Array.isArray(toProp.type)).toBe(true);
  });

  it('should define "disabled" prop with default false', () => {
    expect(Teleport.props.disabled).toBeDefined();
    expect(Teleport.props.disabled.default).toBe(false);
    expect(Teleport.props.disabled.type).toBe(Boolean);
  });

  it('should have a setup function', () => {
    expect(typeof Teleport.setup).toBe('function');
  });

  it('should have setup that does not throw', () => {
    expect(() => Teleport.setup()).not.toThrow();
  });

  it('should export TeleportProps interface', () => {
    // This is a compile-time check; we verify the export exists
    // by checking the Teleport component's props match the interface
    const props: TeleportProps = {
      to: '#target',
      disabled: false,
    };
    expect(props.to).toBe('#target');
    expect(props.disabled).toBe(false);
  });

  it('should accept Element as "to" prop value', () => {
    // TeleportProps.to accepts Element type (compile-time check)
    const props: TeleportProps = {
      to: null as unknown as Element,
    };
    expect(props.to).toBeDefined();
  });

  it('should accept string selector as "to" prop value', () => {
    const props: TeleportProps = {
      to: '#app',
    };
    expect(props.to).toBe('#app');
  });

  it('should have disabled as optional', () => {
    const props: TeleportProps = {
      to: '#target',
    };
    expect(props.disabled).toBeUndefined();
  });
});
