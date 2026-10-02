"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  style,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate bg-black/60 duration-100 supports-backdrop-filter:backdrop-blur-[1px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      style={style}
      {...props}
    />
  )
}

function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  style,
  useFlexLayout = true,
  zIndex,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlayClassName?: string
  useFlexLayout?: boolean
  zIndex?: number
}) {
  let parsedZIndex = zIndex;
  if (parsedZIndex === undefined && typeof className === 'string') {
    const zIndexMatch = className.match(/z-\[(\d+)\]/);
    if (zIndexMatch) {
      parsedZIndex = parseInt(zIndexMatch[1], 10);
    } else {
      const zClassMatch = className.match(/\bz-(\d+)\b/);
      if (zClassMatch) {
        parsedZIndex = parseInt(zClassMatch[1], 10);
      }
    }
  }

  let parsedOverlayZIndex = undefined;
  if (overlayClassName) {
    const zIndexMatch = overlayClassName.match(/z-\[(\d+)\]/);
    if (zIndexMatch) {
      parsedOverlayZIndex = parseInt(zIndexMatch[1], 10);
    } else {
      const zClassMatch = overlayClassName.match(/\bz-(\d+)\b/);
      if (zClassMatch) {
        parsedOverlayZIndex = parseInt(zClassMatch[1], 10);
      }
    }
  }

  const finalZIndex = parsedZIndex ?? 1000;
  const finalOverlayZIndex = parsedOverlayZIndex ?? (finalZIndex - 1);

  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = (e: Event) => e.stopPropagation();
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, []);

  if (useFlexLayout) {
    return (
      <DialogPortal>
        <DialogOverlay className={overlayClassName} style={{ zIndex: finalOverlayZIndex }} />
        <div
          className="fixed inset-0 flex items-center justify-center p-6 overflow-hidden pointer-events-none"
          style={{ zIndex: finalZIndex }}
        >
          <DialogPrimitive.Popup
            ref={contentRef}
            data-slot="dialog-content"
            className={cn(
              "pointer-events-auto w-full gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
              className
            )}
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'geometricPrecision',
              ...style
            }}
            {...props}
          >
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                render={
                  <Button
                    variant="ghost"
                    className="absolute top-2 right-2"
                    size="icon-sm"
                  >
                    <XIcon />
                    <span className="sr-only">Close</span>
                  </Button>
                }
              />
            )}
          </DialogPrimitive.Popup>
        </div>
      </DialogPortal>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} style={{ zIndex: finalOverlayZIndex }} />
      <DialogPrimitive.Popup
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision',
          zIndex: finalZIndex,
          ...style
        }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </Button>
            }
          />
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          render={
            <Button variant="outline">
              Close
            </Button>
          }
        />
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
