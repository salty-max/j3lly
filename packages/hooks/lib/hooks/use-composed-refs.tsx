import React from 'react';

type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Safely assigns a value to a React ref. Supports both function refs and object refs.
 * This utility ensures that the ref is updated without directly mutating the ref object,
 * following React's best practices for handling refs.
 *
 * @param ref - The ref to update. Can be a function ref, an object ref, or `undefined`.
 * @param value - The new value to set for the ref.
 */
function setRef<T>(ref: PossibleRef<T>, value: T): void {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

/**
 * Creates a single ref callback that updates multiple refs. Useful when a component needs to
 * share its ref with multiple owners, such as forwarding a ref and using it locally.
 *
 * @param refs - The refs to compose into a single ref callback.
 * @returns A ref callback that updates all provided refs.
 */
function composeRefs<T>(...refs: PossibleRef<T>[]): (node: T) => void {
  return (node: T) => {
    refs.forEach(ref => {
      setRef(ref, node);
    });
  };
}

/**
 * A hook that composes multiple refs into a single ref callback using `composeRefs`.
 * This hook is useful for components that need to forward a ref and also attach their own
 * ref handler. It ensures that all refs are updated when the component mounts or updates.
 *
 * @param refs - The refs to compose.
 * @returns A memoized ref callback that updates all provided refs.
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]): (node: T) => void {
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
