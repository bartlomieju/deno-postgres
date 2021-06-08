import { Deferred, deferred } from "../deps.ts";

export class DeferredStack<T> {
  #array: Array<T>;
  #creator?: () => Promise<T>;
  #max_size: number;
  #queue: Array<Deferred<T>>;
  #size: number;

  constructor(
    max?: number,
    ls?: Iterable<T>,
    creator?: () => Promise<T>,
  ) {
    this.#array = ls ? [...ls] : [];
    this.#creator = creator;
    this.#max_size = max || 10;
    this.#queue = [];
    this.#size = this.#array.length;
  }

  get available(): number {
    return this.#array.length;
  }

  async pop(): Promise<T> {
    if (this.#array.length > 0) {
      return this.#array.pop()!;
    } else if (this.#size < this.#max_size && this.#creator) {
      this.#size++;
      return await this.#creator();
    }
    const d = deferred<T>();
    this.#queue.push(d);
    await d;
    return this.#array.pop()!;
  }

  push(value: T): void {
    this.#array.push(value);
    if (this.#queue.length > 0) {
      const d = this.#queue.shift()!;
      d.resolve();
    }
  }

  get size(): number {
    return this.#size;
  }
}

/**
 * The DeferredAccessStack provides access to a series of elements created on initialization,
 * but with the caveat that they require an initialization of sorts before they can be used
 *
 * Instead of providing a `creator` function as you would with the `DeferredStack`, you provide
 * an initialization callback to execute for each element that is retrieved from the stack
 */
export class DeferredAccessStack<T> {
  #elements: Array<T>;
  #initializeElement: (element: T) => Promise<void>;
  #queue: Array<Deferred<undefined>>;
  #size: number;

  get available(): number {
    return this.#elements.length;
  }

  /**
   * The number of elements that can be contained in the stack a time
   */
  get size(): number {
    return this.#size;
  }

  /**
   * @param initialize This function will execute for each element that hasn't been initialized when requested from the stack
   */
  constructor(
    elements: T[],
    initCallback: (element: T) => Promise<void>,
  ) {
    this.#elements = elements;
    this.#initializeElement = initCallback;
    this.#queue = [];
    this.#size = elements.length;
  }

  async pop(): Promise<T> {
    let element: T;
    if (this.#elements.length > 0) {
      element = this.#elements.pop()!;
    } else {
      // If there are not elements left in the stack, it will await the call until
      // at least one is restored and then return it
      const d = deferred<undefined>();
      this.#queue.push(d);
      await d;
      element = this.#elements.pop()!;
    }

    await this.#initializeElement(element);
    return element;
  }

  push(value: T): void {
    this.#elements.push(value);
    // If an element has been requested while the stack was empty, indicate
    // that an element has been restored
    if (this.#queue.length > 0) {
      const d = this.#queue.shift()!;
      d.resolve();
    }
  }
}