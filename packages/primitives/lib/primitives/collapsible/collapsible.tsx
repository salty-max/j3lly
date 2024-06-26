import { createContextScope, type Scope } from '@briks/core';
import { useComposedRefs, useControllableState, useId, useLayoutEffect } from '@briks/hooks';
import React from 'react';

import { Presence } from '..';
import { composeEventHandlers, Primitive } from '../primitive';

import type * as Briks from '../primitive';

/* -------------------------------------------------------------------------------------------------
 * Collapsible
 * -----------------------------------------------------------------------------------------------*/

const COLLAPSIBLE_NAME = 'Collapsible';

type ScopedProps<P> = P & { __scopeCollapsible?: Scope };
const [createCollapsibleContext, createCollapsibleScope] = createContextScope(COLLAPSIBLE_NAME);

type CollapsibleContextValue = {
  contentId: string;
  disabled?: boolean;
  open: boolean;
  onOpenToggle(): void;
};

const [CollapsibleProvider, useCollapsibleContext] =
  createCollapsibleContext<CollapsibleContextValue>(COLLAPSIBLE_NAME);

type CollapsibleElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = Briks.ComponentPropsWithoutRef<typeof Primitive.div>;
interface CollapsibleProps extends PrimitiveDivProps {
  defaultOpen?: boolean;
  open?: boolean;
  disabled?: boolean;
  onOpenChange?(open: boolean): void;
}

const Collapsible = React.forwardRef<CollapsibleElement, CollapsibleProps>(
  (
    {
      __scopeCollapsible,
      open: openProp,
      defaultOpen,
      disabled,
      onOpenChange,
      ...props
    }: ScopedProps<CollapsibleProps>,
    forwardedRef,
  ) => {
    const [open = false, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    return (
      <CollapsibleProvider
        scope={__scopeCollapsible}
        disabled={disabled}
        contentId={useId()}
        open={open}
        onOpenToggle={React.useCallback(() => setOpen(prevOpen => !prevOpen), [setOpen])}
      >
        <Primitive.div
          data-state={getState(open)}
          data-disabled={disabled ? '' : undefined}
          {...props}
          ref={forwardedRef}
        />
      </CollapsibleProvider>
    );
  },
);

Collapsible.displayName = COLLAPSIBLE_NAME;

/* -------------------------------------------------------------------------------------------------
 * CollapsibleTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'CollapsibleTrigger';

type CollapsibleTriggerElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = Briks.ComponentPropsWithoutRef<typeof Primitive.button>;
interface CollapsibleTriggerProps extends PrimitiveButtonProps {}

const CollapsibleTrigger = React.forwardRef<CollapsibleTriggerElement, CollapsibleTriggerProps>(
  ({ __scopeCollapsible, ...props }: ScopedProps<CollapsibleTriggerProps>, forwardedRef) => {
    const context = useCollapsibleContext(TRIGGER_NAME, __scopeCollapsible);

    return (
      <Primitive.button
        type='button'
        aria-controls={context.contentId}
        aria-expanded={context.open || false}
        data-state={getState(context.open)}
        data-disabled={context.disabled ? '' : undefined}
        disabled={context.disabled}
        {...props}
        ref={forwardedRef}
        onClick={composeEventHandlers(props.onClick, context.onOpenToggle)}
      />
    );
  },
);

CollapsibleTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * CollapsibleContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'CollapsibleContent';

type CollapsibleContentElement = CollapsibleContentImplElement;
interface CollapsibleContentProps extends Omit<CollapsibleContentImplProps, 'present'> {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true;
}

const CollapsibleContent = React.forwardRef<CollapsibleContentElement, CollapsibleContentProps>(
  ({ forceMount, ...props }: ScopedProps<CollapsibleContentProps>, forwardedRef) => {
    const context = useCollapsibleContext(CONTENT_NAME, props.__scopeCollapsible);

    return (
      <Presence present={forceMount || context.open}>
        {({ present }) => (
          <CollapsibleContentImpl {...props} present={present} ref={forwardedRef} />
        )}
      </Presence>
    );
  },
);

CollapsibleContent.displayName = CONTENT_NAME;

/* -----------------------------------------------------------------------------------------------*/

type CollapsibleContentImplElement = React.ElementRef<typeof Primitive.div>;
interface CollapsibleContentImplProps extends PrimitiveDivProps {
  present: boolean;
}

const CollapsibleContentImpl = React.forwardRef<
  CollapsibleContentImplElement,
  CollapsibleContentImplProps
>(
  (
    { __scopeCollapsible, present, children, ...props }: ScopedProps<CollapsibleContentImplProps>,
    forwardedRef,
  ) => {
    const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible);
    const [isPresent, setIsPresent] = React.useState(present);
    const ref = React.useRef<CollapsibleContentImplElement>(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const heightRef = React.useRef<number | undefined>(0);
    const height = heightRef.current;
    const widthRef = React.useRef<number | undefined>(0);
    const width = widthRef.current;
    // When opening we want it to immediately open to retrieve dimensions
    // When closing we delay `present` to retrieve dimensions before closing
    const isOpen = context.open || isPresent;
    const isMountAnimationPreventedRef = React.useRef(isOpen);
    const originalStylesRef = React.useRef<Record<string, string>>();

    React.useEffect(() => {
      const rAF = requestAnimationFrame(() => (isMountAnimationPreventedRef.current = false));
      return () => cancelAnimationFrame(rAF);
    }, []);

    useLayoutEffect(() => {
      const node = ref.current;
      if (node) {
        originalStylesRef.current = originalStylesRef.current || {
          transitionDuration: node.style.transitionDuration,
          animationName: node.style.animationName,
        };
        // Block any animations/transitions so the element renders at its full dimensions
        node.style.transitionDuration = '0s';
        node.style.animationName = 'none';

        // Get width and height from full dimensions
        const rect = node.getBoundingClientRect();
        heightRef.current = rect.height;
        widthRef.current = rect.width;

        // Kick off any animations/transitions that were originally set up if it isn't the initial mount
        if (!isMountAnimationPreventedRef.current) {
          node.style.transitionDuration = originalStylesRef.current.transitionDuration;
          node.style.animationName = originalStylesRef.current.animationName;
        }

        setIsPresent(present);
      }
      /**
       * Depends on `context.open` because it will change to `false`
       * when a close is triggered but `present` will be `false` on
       * animation end (so when close finishes). This allows us to
       * retrieve the dimensions *before* closing.
       */
    }, [context.open, present]);

    return (
      <Primitive.div
        data-state={getState(context.open)}
        data-disabled={context.disabled ? '' : undefined}
        id={context.contentId}
        hidden={!isOpen}
        {...props}
        ref={composedRefs}
        style={{
          [`--collapsible-content-height` as any]: height ? `${height}px` : undefined,
          [`--collapsible-content-width` as any]: width ? `${width}px` : undefined,
          ...props.style,
        }}
      >
        {isOpen && children}
      </Primitive.div>
    );
  },
);

/* -----------------------------------------------------------------------------------------------*/

function getState(open?: boolean) {
  return open ? 'open' : 'collapsed';
}

const Root = Collapsible;
const Trigger = CollapsibleTrigger;
const Content = CollapsibleContent;

export {
  //
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Content,
  createCollapsibleScope,
  //
  Root,
  Trigger,
};

export type { CollapsibleContentProps, CollapsibleProps, CollapsibleTriggerProps };
