/** Creates an error for when that database is already open during an attempt to open it. */
export function alreadyOpenError() {
  return new Error("Database is already open.");
}

/** Creates an error for when that database is already closed during an attempt to close it. */
export function alreadyClosedError() {
  return new Error("Database is already closed.");
}

/** Creates an error for when that database can't perform an operation because it is closed. */
export function noOpWhileClosedError() {
  return new Error("Can't perform operation while database is closed.");
}
