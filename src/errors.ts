/**
 * Error codes emitted by TreeController and TreeError.
 */
export type TreeErrorCode =
  | "duplicate_id"
  | "too_large"
  | "too_deep"
  | "invalid_option"
  | "invalid_node"
  | "unknown_id";

/**
 * Typed error for virtual-tree-view operations.
 */
export class TreeError extends Error {
  readonly code: TreeErrorCode;

  constructor(code: TreeErrorCode, message: string) {
    const safeMessage = message.length > 200 ? message.slice(0, 200) : message;
    super(safeMessage);
    this.name = "TreeError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
