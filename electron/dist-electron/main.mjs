import { createRequire } from "node:module";
import { BrowserWindow, app, dialog, ipcMain, session, shell } from "electron";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import path from "path";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import Stream, { PassThrough, pipeline } from "node:stream";
import { Buffer as Buffer$1 } from "node:buffer";
import { deprecate, promisify, types } from "node:util";
import { format } from "node:url";
import { isIP } from "node:net";
import { createReadStream, promises } from "node:fs";
import fs from "fs";

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i$1 = 0, n = keys.length, key; i$1 < n; i$1++) {
			key = keys[i$1];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region node_modules/data-uri-to-buffer/dist/index.js
/**
* Returns a `Buffer` instance from the given data URI `uri`.
*
* @param {String} uri Data URI to turn into a Buffer instance
* @returns {Buffer} Buffer instance from Data URI
* @api public
*/
function dataUriToBuffer(uri) {
	if (!/^data:/i.test(uri)) throw new TypeError("`uri` does not appear to be a Data URI (must begin with \"data:\")");
	uri = uri.replace(/\r?\n/g, "");
	const firstComma = uri.indexOf(",");
	if (firstComma === -1 || firstComma <= 4) throw new TypeError("malformed data: URI");
	const meta = uri.substring(5, firstComma).split(";");
	let charset = "";
	let base64 = false;
	const type = meta[0] || "text/plain";
	let typeFull = type;
	for (let i$1 = 1; i$1 < meta.length; i$1++) if (meta[i$1] === "base64") base64 = true;
	else if (meta[i$1]) {
		typeFull += `;${meta[i$1]}`;
		if (meta[i$1].indexOf("charset=") === 0) charset = meta[i$1].substring(8);
	}
	if (!meta[0] && !charset.length) {
		typeFull += ";charset=US-ASCII";
		charset = "US-ASCII";
	}
	const encoding = base64 ? "base64" : "ascii";
	const data = unescape(uri.substring(firstComma + 1));
	const buffer = Buffer.from(data, encoding);
	buffer.type = type;
	buffer.typeFull = typeFull;
	buffer.charset = charset;
	return buffer;
}
var dist_default = dataUriToBuffer;

//#endregion
//#region node_modules/web-streams-polyfill/dist/ponyfill.es2018.js
var require_ponyfill_es2018 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* @license
	* web-streams-polyfill v3.3.3
	* Copyright 2024 Mattias Buelens, Diwank Singh Tomer and other contributors.
	* This code is released under the MIT license.
	* SPDX-License-Identifier: MIT
	*/
	(function(global$1, factory) {
		typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global$1 = typeof globalThis !== "undefined" ? globalThis : global$1 || self, factory(global$1.WebStreamsPolyfill = {}));
	})(exports, (function(exports$1) {
		"use strict";
		function noop() {}
		function typeIsObject(x$1) {
			return typeof x$1 === "object" && x$1 !== null || typeof x$1 === "function";
		}
		const rethrowAssertionErrorRejection = noop;
		function setFunctionName(fn, name) {
			try {
				Object.defineProperty(fn, "name", {
					value: name,
					configurable: true
				});
			} catch (_a$1) {}
		}
		const originalPromise = Promise;
		const originalPromiseThen = Promise.prototype.then;
		const originalPromiseReject = Promise.reject.bind(originalPromise);
		function newPromise(executor) {
			return new originalPromise(executor);
		}
		function promiseResolvedWith(value) {
			return newPromise((resolve) => resolve(value));
		}
		function promiseRejectedWith(reason) {
			return originalPromiseReject(reason);
		}
		function PerformPromiseThen(promise, onFulfilled, onRejected) {
			return originalPromiseThen.call(promise, onFulfilled, onRejected);
		}
		function uponPromise(promise, onFulfilled, onRejected) {
			PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
		}
		function uponFulfillment(promise, onFulfilled) {
			uponPromise(promise, onFulfilled);
		}
		function uponRejection(promise, onRejected) {
			uponPromise(promise, void 0, onRejected);
		}
		function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
			return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
		}
		function setPromiseIsHandledToTrue(promise) {
			PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
		}
		let _queueMicrotask = (callback) => {
			if (typeof queueMicrotask === "function") _queueMicrotask = queueMicrotask;
			else {
				const resolvedPromise = promiseResolvedWith(void 0);
				_queueMicrotask = (cb) => PerformPromiseThen(resolvedPromise, cb);
			}
			return _queueMicrotask(callback);
		};
		function reflectCall(F, V, args) {
			if (typeof F !== "function") throw new TypeError("Argument is not a function");
			return Function.prototype.apply.call(F, V, args);
		}
		function promiseCall(F, V, args) {
			try {
				return promiseResolvedWith(reflectCall(F, V, args));
			} catch (value) {
				return promiseRejectedWith(value);
			}
		}
		const QUEUE_MAX_ARRAY_SIZE = 16384;
		/**
		* Simple queue structure.
		*
		* Avoids scalability issues with using a packed array directly by using
		* multiple arrays in a linked list and keeping the array size bounded.
		*/
		class SimpleQueue {
			constructor() {
				this._cursor = 0;
				this._size = 0;
				this._front = {
					_elements: [],
					_next: void 0
				};
				this._back = this._front;
				this._cursor = 0;
				this._size = 0;
			}
			get length() {
				return this._size;
			}
			push(element) {
				const oldBack = this._back;
				let newBack = oldBack;
				if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) newBack = {
					_elements: [],
					_next: void 0
				};
				oldBack._elements.push(element);
				if (newBack !== oldBack) {
					this._back = newBack;
					oldBack._next = newBack;
				}
				++this._size;
			}
			shift() {
				const oldFront = this._front;
				let newFront = oldFront;
				const oldCursor = this._cursor;
				let newCursor = oldCursor + 1;
				const elements = oldFront._elements;
				const element = elements[oldCursor];
				if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
					newFront = oldFront._next;
					newCursor = 0;
				}
				--this._size;
				this._cursor = newCursor;
				if (oldFront !== newFront) this._front = newFront;
				elements[oldCursor] = void 0;
				return element;
			}
			forEach(callback) {
				let i$1 = this._cursor;
				let node = this._front;
				let elements = node._elements;
				while (i$1 !== elements.length || node._next !== void 0) {
					if (i$1 === elements.length) {
						node = node._next;
						elements = node._elements;
						i$1 = 0;
						if (elements.length === 0) break;
					}
					callback(elements[i$1]);
					++i$1;
				}
			}
			peek() {
				const front = this._front;
				const cursor = this._cursor;
				return front._elements[cursor];
			}
		}
		const AbortSteps = Symbol("[[AbortSteps]]");
		const ErrorSteps = Symbol("[[ErrorSteps]]");
		const CancelSteps = Symbol("[[CancelSteps]]");
		const PullSteps = Symbol("[[PullSteps]]");
		const ReleaseSteps = Symbol("[[ReleaseSteps]]");
		function ReadableStreamReaderGenericInitialize(reader, stream) {
			reader._ownerReadableStream = stream;
			stream._reader = reader;
			if (stream._state === "readable") defaultReaderClosedPromiseInitialize(reader);
			else if (stream._state === "closed") defaultReaderClosedPromiseInitializeAsResolved(reader);
			else defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
		}
		function ReadableStreamReaderGenericCancel(reader, reason) {
			const stream = reader._ownerReadableStream;
			return ReadableStreamCancel(stream, reason);
		}
		function ReadableStreamReaderGenericRelease(reader) {
			const stream = reader._ownerReadableStream;
			if (stream._state === "readable") defaultReaderClosedPromiseReject(reader, /* @__PURE__ */ new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
			else defaultReaderClosedPromiseResetToRejected(reader, /* @__PURE__ */ new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
			stream._readableStreamController[ReleaseSteps]();
			stream._reader = void 0;
			reader._ownerReadableStream = void 0;
		}
		function readerLockException(name) {
			return /* @__PURE__ */ new TypeError("Cannot " + name + " a stream using a released reader");
		}
		function defaultReaderClosedPromiseInitialize(reader) {
			reader._closedPromise = newPromise((resolve, reject) => {
				reader._closedPromise_resolve = resolve;
				reader._closedPromise_reject = reject;
			});
		}
		function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
			defaultReaderClosedPromiseInitialize(reader);
			defaultReaderClosedPromiseReject(reader, reason);
		}
		function defaultReaderClosedPromiseInitializeAsResolved(reader) {
			defaultReaderClosedPromiseInitialize(reader);
			defaultReaderClosedPromiseResolve(reader);
		}
		function defaultReaderClosedPromiseReject(reader, reason) {
			if (reader._closedPromise_reject === void 0) return;
			setPromiseIsHandledToTrue(reader._closedPromise);
			reader._closedPromise_reject(reason);
			reader._closedPromise_resolve = void 0;
			reader._closedPromise_reject = void 0;
		}
		function defaultReaderClosedPromiseResetToRejected(reader, reason) {
			defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
		}
		function defaultReaderClosedPromiseResolve(reader) {
			if (reader._closedPromise_resolve === void 0) return;
			reader._closedPromise_resolve(void 0);
			reader._closedPromise_resolve = void 0;
			reader._closedPromise_reject = void 0;
		}
		const NumberIsFinite = Number.isFinite || function(x$1) {
			return typeof x$1 === "number" && isFinite(x$1);
		};
		const MathTrunc = Math.trunc || function(v) {
			return v < 0 ? Math.ceil(v) : Math.floor(v);
		};
		function isDictionary(x$1) {
			return typeof x$1 === "object" || typeof x$1 === "function";
		}
		function assertDictionary(obj, context) {
			if (obj !== void 0 && !isDictionary(obj)) throw new TypeError(`${context} is not an object.`);
		}
		function assertFunction(x$1, context) {
			if (typeof x$1 !== "function") throw new TypeError(`${context} is not a function.`);
		}
		function isObject(x$1) {
			return typeof x$1 === "object" && x$1 !== null || typeof x$1 === "function";
		}
		function assertObject(x$1, context) {
			if (!isObject(x$1)) throw new TypeError(`${context} is not an object.`);
		}
		function assertRequiredArgument(x$1, position, context) {
			if (x$1 === void 0) throw new TypeError(`Parameter ${position} is required in '${context}'.`);
		}
		function assertRequiredField(x$1, field, context) {
			if (x$1 === void 0) throw new TypeError(`${field} is required in '${context}'.`);
		}
		function convertUnrestrictedDouble(value) {
			return Number(value);
		}
		function censorNegativeZero(x$1) {
			return x$1 === 0 ? 0 : x$1;
		}
		function integerPart(x$1) {
			return censorNegativeZero(MathTrunc(x$1));
		}
		function convertUnsignedLongLongWithEnforceRange(value, context) {
			const lowerBound = 0;
			const upperBound = Number.MAX_SAFE_INTEGER;
			let x$1 = Number(value);
			x$1 = censorNegativeZero(x$1);
			if (!NumberIsFinite(x$1)) throw new TypeError(`${context} is not a finite number`);
			x$1 = integerPart(x$1);
			if (x$1 < lowerBound || x$1 > upperBound) throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
			if (!NumberIsFinite(x$1) || x$1 === 0) return 0;
			return x$1;
		}
		function assertReadableStream(x$1, context) {
			if (!IsReadableStream(x$1)) throw new TypeError(`${context} is not a ReadableStream.`);
		}
		function AcquireReadableStreamDefaultReader(stream) {
			return new ReadableStreamDefaultReader(stream);
		}
		function ReadableStreamAddReadRequest(stream, readRequest) {
			stream._reader._readRequests.push(readRequest);
		}
		function ReadableStreamFulfillReadRequest(stream, chunk, done) {
			const readRequest = stream._reader._readRequests.shift();
			if (done) readRequest._closeSteps();
			else readRequest._chunkSteps(chunk);
		}
		function ReadableStreamGetNumReadRequests(stream) {
			return stream._reader._readRequests.length;
		}
		function ReadableStreamHasDefaultReader(stream) {
			const reader = stream._reader;
			if (reader === void 0) return false;
			if (!IsReadableStreamDefaultReader(reader)) return false;
			return true;
		}
		/**
		* A default reader vended by a {@link ReadableStream}.
		*
		* @public
		*/
		class ReadableStreamDefaultReader {
			constructor(stream) {
				assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
				assertReadableStream(stream, "First parameter");
				if (IsReadableStreamLocked(stream)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
				ReadableStreamReaderGenericInitialize(this, stream);
				this._readRequests = new SimpleQueue();
			}
			/**
			* Returns a promise that will be fulfilled when the stream becomes closed,
			* or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
			*/
			get closed() {
				if (!IsReadableStreamDefaultReader(this)) return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
				return this._closedPromise;
			}
			/**
			* If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
			*/
			cancel(reason = void 0) {
				if (!IsReadableStreamDefaultReader(this)) return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
				if (this._ownerReadableStream === void 0) return promiseRejectedWith(readerLockException("cancel"));
				return ReadableStreamReaderGenericCancel(this, reason);
			}
			/**
			* Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
			*
			* If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
			*/
			read() {
				if (!IsReadableStreamDefaultReader(this)) return promiseRejectedWith(defaultReaderBrandCheckException("read"));
				if (this._ownerReadableStream === void 0) return promiseRejectedWith(readerLockException("read from"));
				let resolvePromise;
				let rejectPromise;
				const promise = newPromise((resolve, reject) => {
					resolvePromise = resolve;
					rejectPromise = reject;
				});
				ReadableStreamDefaultReaderRead(this, {
					_chunkSteps: (chunk) => resolvePromise({
						value: chunk,
						done: false
					}),
					_closeSteps: () => resolvePromise({
						value: void 0,
						done: true
					}),
					_errorSteps: (e$1) => rejectPromise(e$1)
				});
				return promise;
			}
			/**
			* Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
			* If the associated stream is errored when the lock is released, the reader will appear errored in the same way
			* from now on; otherwise, the reader will appear closed.
			*
			* A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
			* the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
			* do so will throw a `TypeError` and leave the reader locked to the stream.
			*/
			releaseLock() {
				if (!IsReadableStreamDefaultReader(this)) throw defaultReaderBrandCheckException("releaseLock");
				if (this._ownerReadableStream === void 0) return;
				ReadableStreamDefaultReaderRelease(this);
			}
		}
		Object.defineProperties(ReadableStreamDefaultReader.prototype, {
			cancel: { enumerable: true },
			read: { enumerable: true },
			releaseLock: { enumerable: true },
			closed: { enumerable: true }
		});
		setFunctionName(ReadableStreamDefaultReader.prototype.cancel, "cancel");
		setFunctionName(ReadableStreamDefaultReader.prototype.read, "read");
		setFunctionName(ReadableStreamDefaultReader.prototype.releaseLock, "releaseLock");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableStreamDefaultReader.prototype, Symbol.toStringTag, {
			value: "ReadableStreamDefaultReader",
			configurable: true
		});
		function IsReadableStreamDefaultReader(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_readRequests")) return false;
			return x$1 instanceof ReadableStreamDefaultReader;
		}
		function ReadableStreamDefaultReaderRead(reader, readRequest) {
			const stream = reader._ownerReadableStream;
			stream._disturbed = true;
			if (stream._state === "closed") readRequest._closeSteps();
			else if (stream._state === "errored") readRequest._errorSteps(stream._storedError);
			else stream._readableStreamController[PullSteps](readRequest);
		}
		function ReadableStreamDefaultReaderRelease(reader) {
			ReadableStreamReaderGenericRelease(reader);
			ReadableStreamDefaultReaderErrorReadRequests(reader, /* @__PURE__ */ new TypeError("Reader was released"));
		}
		function ReadableStreamDefaultReaderErrorReadRequests(reader, e$1) {
			const readRequests = reader._readRequests;
			reader._readRequests = new SimpleQueue();
			readRequests.forEach((readRequest) => {
				readRequest._errorSteps(e$1);
			});
		}
		function defaultReaderBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
		}
		const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {}).prototype);
		class ReadableStreamAsyncIteratorImpl {
			constructor(reader, preventCancel) {
				this._ongoingPromise = void 0;
				this._isFinished = false;
				this._reader = reader;
				this._preventCancel = preventCancel;
			}
			next() {
				const nextSteps = () => this._nextSteps();
				this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
				return this._ongoingPromise;
			}
			return(value) {
				const returnSteps = () => this._returnSteps(value);
				return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
			}
			_nextSteps() {
				if (this._isFinished) return Promise.resolve({
					value: void 0,
					done: true
				});
				const reader = this._reader;
				let resolvePromise;
				let rejectPromise;
				const promise = newPromise((resolve, reject) => {
					resolvePromise = resolve;
					rejectPromise = reject;
				});
				ReadableStreamDefaultReaderRead(reader, {
					_chunkSteps: (chunk) => {
						this._ongoingPromise = void 0;
						_queueMicrotask(() => resolvePromise({
							value: chunk,
							done: false
						}));
					},
					_closeSteps: () => {
						this._ongoingPromise = void 0;
						this._isFinished = true;
						ReadableStreamReaderGenericRelease(reader);
						resolvePromise({
							value: void 0,
							done: true
						});
					},
					_errorSteps: (reason) => {
						this._ongoingPromise = void 0;
						this._isFinished = true;
						ReadableStreamReaderGenericRelease(reader);
						rejectPromise(reason);
					}
				});
				return promise;
			}
			_returnSteps(value) {
				if (this._isFinished) return Promise.resolve({
					value,
					done: true
				});
				this._isFinished = true;
				const reader = this._reader;
				if (!this._preventCancel) {
					const result = ReadableStreamReaderGenericCancel(reader, value);
					ReadableStreamReaderGenericRelease(reader);
					return transformPromiseWith(result, () => ({
						value,
						done: true
					}));
				}
				ReadableStreamReaderGenericRelease(reader);
				return promiseResolvedWith({
					value,
					done: true
				});
			}
		}
		const ReadableStreamAsyncIteratorPrototype = {
			next() {
				if (!IsReadableStreamAsyncIterator(this)) return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
				return this._asyncIteratorImpl.next();
			},
			return(value) {
				if (!IsReadableStreamAsyncIterator(this)) return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
				return this._asyncIteratorImpl.return(value);
			}
		};
		Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
		function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
			const impl = new ReadableStreamAsyncIteratorImpl(AcquireReadableStreamDefaultReader(stream), preventCancel);
			const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
			iterator._asyncIteratorImpl = impl;
			return iterator;
		}
		function IsReadableStreamAsyncIterator(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_asyncIteratorImpl")) return false;
			try {
				return x$1._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
			} catch (_a$1) {
				return false;
			}
		}
		function streamAsyncIteratorBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
		}
		const NumberIsNaN = Number.isNaN || function(x$1) {
			return x$1 !== x$1;
		};
		var _a, _b, _c;
		function CreateArrayFromList(elements) {
			return elements.slice();
		}
		function CopyDataBlockBytes(dest, destOffset, src, srcOffset, n) {
			new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
		}
		let TransferArrayBuffer = (O) => {
			if (typeof O.transfer === "function") TransferArrayBuffer = (buffer) => buffer.transfer();
			else if (typeof structuredClone === "function") TransferArrayBuffer = (buffer) => structuredClone(buffer, { transfer: [buffer] });
			else TransferArrayBuffer = (buffer) => buffer;
			return TransferArrayBuffer(O);
		};
		let IsDetachedBuffer = (O) => {
			if (typeof O.detached === "boolean") IsDetachedBuffer = (buffer) => buffer.detached;
			else IsDetachedBuffer = (buffer) => buffer.byteLength === 0;
			return IsDetachedBuffer(O);
		};
		function ArrayBufferSlice(buffer, begin, end) {
			if (buffer.slice) return buffer.slice(begin, end);
			const length = end - begin;
			const slice = new ArrayBuffer(length);
			CopyDataBlockBytes(slice, 0, buffer, begin, length);
			return slice;
		}
		function GetMethod(receiver, prop) {
			const func = receiver[prop];
			if (func === void 0 || func === null) return;
			if (typeof func !== "function") throw new TypeError(`${String(prop)} is not a function`);
			return func;
		}
		function CreateAsyncFromSyncIterator(syncIteratorRecord) {
			const syncIterable = { [Symbol.iterator]: () => syncIteratorRecord.iterator };
			const asyncIterator = async function* () {
				return yield* syncIterable;
			}();
			return {
				iterator: asyncIterator,
				nextMethod: asyncIterator.next,
				done: false
			};
		}
		const SymbolAsyncIterator = (_c = (_a = Symbol.asyncIterator) !== null && _a !== void 0 ? _a : (_b = Symbol.for) === null || _b === void 0 ? void 0 : _b.call(Symbol, "Symbol.asyncIterator")) !== null && _c !== void 0 ? _c : "@@asyncIterator";
		function GetIterator(obj, hint = "sync", method) {
			if (method === void 0) if (hint === "async") {
				method = GetMethod(obj, SymbolAsyncIterator);
				if (method === void 0) return CreateAsyncFromSyncIterator(GetIterator(obj, "sync", GetMethod(obj, Symbol.iterator)));
			} else method = GetMethod(obj, Symbol.iterator);
			if (method === void 0) throw new TypeError("The object is not iterable");
			const iterator = reflectCall(method, obj, []);
			if (!typeIsObject(iterator)) throw new TypeError("The iterator method must return an object");
			return {
				iterator,
				nextMethod: iterator.next,
				done: false
			};
		}
		function IteratorNext(iteratorRecord) {
			const result = reflectCall(iteratorRecord.nextMethod, iteratorRecord.iterator, []);
			if (!typeIsObject(result)) throw new TypeError("The iterator.next() method must return an object");
			return result;
		}
		function IteratorComplete(iterResult) {
			return Boolean(iterResult.done);
		}
		function IteratorValue(iterResult) {
			return iterResult.value;
		}
		function IsNonNegativeNumber(v) {
			if (typeof v !== "number") return false;
			if (NumberIsNaN(v)) return false;
			if (v < 0) return false;
			return true;
		}
		function CloneAsUint8Array(O) {
			const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
			return new Uint8Array(buffer);
		}
		function DequeueValue(container) {
			const pair = container._queue.shift();
			container._queueTotalSize -= pair.size;
			if (container._queueTotalSize < 0) container._queueTotalSize = 0;
			return pair.value;
		}
		function EnqueueValueWithSize(container, value, size) {
			if (!IsNonNegativeNumber(size) || size === Infinity) throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
			container._queue.push({
				value,
				size
			});
			container._queueTotalSize += size;
		}
		function PeekQueueValue(container) {
			return container._queue.peek().value;
		}
		function ResetQueue(container) {
			container._queue = new SimpleQueue();
			container._queueTotalSize = 0;
		}
		function isDataViewConstructor(ctor) {
			return ctor === DataView;
		}
		function isDataView(view) {
			return isDataViewConstructor(view.constructor);
		}
		function arrayBufferViewElementSize(ctor) {
			if (isDataViewConstructor(ctor)) return 1;
			return ctor.BYTES_PER_ELEMENT;
		}
		/**
		* A pull-into request in a {@link ReadableByteStreamController}.
		*
		* @public
		*/
		class ReadableStreamBYOBRequest {
			constructor() {
				throw new TypeError("Illegal constructor");
			}
			/**
			* Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
			*/
			get view() {
				if (!IsReadableStreamBYOBRequest(this)) throw byobRequestBrandCheckException("view");
				return this._view;
			}
			respond(bytesWritten) {
				if (!IsReadableStreamBYOBRequest(this)) throw byobRequestBrandCheckException("respond");
				assertRequiredArgument(bytesWritten, 1, "respond");
				bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
				if (this._associatedReadableByteStreamController === void 0) throw new TypeError("This BYOB request has been invalidated");
				if (IsDetachedBuffer(this._view.buffer)) throw new TypeError(`The BYOB request's buffer has been detached and so cannot be used as a response`);
				ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
			}
			respondWithNewView(view) {
				if (!IsReadableStreamBYOBRequest(this)) throw byobRequestBrandCheckException("respondWithNewView");
				assertRequiredArgument(view, 1, "respondWithNewView");
				if (!ArrayBuffer.isView(view)) throw new TypeError("You can only respond with array buffer views");
				if (this._associatedReadableByteStreamController === void 0) throw new TypeError("This BYOB request has been invalidated");
				if (IsDetachedBuffer(view.buffer)) throw new TypeError("The given view's buffer has been detached and so cannot be used as a response");
				ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
			}
		}
		Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
			respond: { enumerable: true },
			respondWithNewView: { enumerable: true },
			view: { enumerable: true }
		});
		setFunctionName(ReadableStreamBYOBRequest.prototype.respond, "respond");
		setFunctionName(ReadableStreamBYOBRequest.prototype.respondWithNewView, "respondWithNewView");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableStreamBYOBRequest.prototype, Symbol.toStringTag, {
			value: "ReadableStreamBYOBRequest",
			configurable: true
		});
		/**
		* Allows control of a {@link ReadableStream | readable byte stream}'s state and internal queue.
		*
		* @public
		*/
		class ReadableByteStreamController {
			constructor() {
				throw new TypeError("Illegal constructor");
			}
			/**
			* Returns the current BYOB pull request, or `null` if there isn't one.
			*/
			get byobRequest() {
				if (!IsReadableByteStreamController(this)) throw byteStreamControllerBrandCheckException("byobRequest");
				return ReadableByteStreamControllerGetBYOBRequest(this);
			}
			/**
			* Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
			* over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
			*/
			get desiredSize() {
				if (!IsReadableByteStreamController(this)) throw byteStreamControllerBrandCheckException("desiredSize");
				return ReadableByteStreamControllerGetDesiredSize(this);
			}
			/**
			* Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
			* the stream, but once those are read, the stream will become closed.
			*/
			close() {
				if (!IsReadableByteStreamController(this)) throw byteStreamControllerBrandCheckException("close");
				if (this._closeRequested) throw new TypeError("The stream has already been closed; do not close it again!");
				const state = this._controlledReadableByteStream._state;
				if (state !== "readable") throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
				ReadableByteStreamControllerClose(this);
			}
			enqueue(chunk) {
				if (!IsReadableByteStreamController(this)) throw byteStreamControllerBrandCheckException("enqueue");
				assertRequiredArgument(chunk, 1, "enqueue");
				if (!ArrayBuffer.isView(chunk)) throw new TypeError("chunk must be an array buffer view");
				if (chunk.byteLength === 0) throw new TypeError("chunk must have non-zero byteLength");
				if (chunk.buffer.byteLength === 0) throw new TypeError(`chunk's buffer must have non-zero byteLength`);
				if (this._closeRequested) throw new TypeError("stream is closed or draining");
				const state = this._controlledReadableByteStream._state;
				if (state !== "readable") throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
				ReadableByteStreamControllerEnqueue(this, chunk);
			}
			/**
			* Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
			*/
			error(e$1 = void 0) {
				if (!IsReadableByteStreamController(this)) throw byteStreamControllerBrandCheckException("error");
				ReadableByteStreamControllerError(this, e$1);
			}
			/** @internal */
			[CancelSteps](reason) {
				ReadableByteStreamControllerClearPendingPullIntos(this);
				ResetQueue(this);
				const result = this._cancelAlgorithm(reason);
				ReadableByteStreamControllerClearAlgorithms(this);
				return result;
			}
			/** @internal */
			[PullSteps](readRequest) {
				const stream = this._controlledReadableByteStream;
				if (this._queueTotalSize > 0) {
					ReadableByteStreamControllerFillReadRequestFromQueue(this, readRequest);
					return;
				}
				const autoAllocateChunkSize = this._autoAllocateChunkSize;
				if (autoAllocateChunkSize !== void 0) {
					let buffer;
					try {
						buffer = new ArrayBuffer(autoAllocateChunkSize);
					} catch (bufferE) {
						readRequest._errorSteps(bufferE);
						return;
					}
					const pullIntoDescriptor = {
						buffer,
						bufferByteLength: autoAllocateChunkSize,
						byteOffset: 0,
						byteLength: autoAllocateChunkSize,
						bytesFilled: 0,
						minimumFill: 1,
						elementSize: 1,
						viewConstructor: Uint8Array,
						readerType: "default"
					};
					this._pendingPullIntos.push(pullIntoDescriptor);
				}
				ReadableStreamAddReadRequest(stream, readRequest);
				ReadableByteStreamControllerCallPullIfNeeded(this);
			}
			/** @internal */
			[ReleaseSteps]() {
				if (this._pendingPullIntos.length > 0) {
					const firstPullInto = this._pendingPullIntos.peek();
					firstPullInto.readerType = "none";
					this._pendingPullIntos = new SimpleQueue();
					this._pendingPullIntos.push(firstPullInto);
				}
			}
		}
		Object.defineProperties(ReadableByteStreamController.prototype, {
			close: { enumerable: true },
			enqueue: { enumerable: true },
			error: { enumerable: true },
			byobRequest: { enumerable: true },
			desiredSize: { enumerable: true }
		});
		setFunctionName(ReadableByteStreamController.prototype.close, "close");
		setFunctionName(ReadableByteStreamController.prototype.enqueue, "enqueue");
		setFunctionName(ReadableByteStreamController.prototype.error, "error");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableByteStreamController.prototype, Symbol.toStringTag, {
			value: "ReadableByteStreamController",
			configurable: true
		});
		function IsReadableByteStreamController(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_controlledReadableByteStream")) return false;
			return x$1 instanceof ReadableByteStreamController;
		}
		function IsReadableStreamBYOBRequest(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_associatedReadableByteStreamController")) return false;
			return x$1 instanceof ReadableStreamBYOBRequest;
		}
		function ReadableByteStreamControllerCallPullIfNeeded(controller) {
			if (!ReadableByteStreamControllerShouldCallPull(controller)) return;
			if (controller._pulling) {
				controller._pullAgain = true;
				return;
			}
			controller._pulling = true;
			uponPromise(controller._pullAlgorithm(), () => {
				controller._pulling = false;
				if (controller._pullAgain) {
					controller._pullAgain = false;
					ReadableByteStreamControllerCallPullIfNeeded(controller);
				}
				return null;
			}, (e$1) => {
				ReadableByteStreamControllerError(controller, e$1);
				return null;
			});
		}
		function ReadableByteStreamControllerClearPendingPullIntos(controller) {
			ReadableByteStreamControllerInvalidateBYOBRequest(controller);
			controller._pendingPullIntos = new SimpleQueue();
		}
		function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
			let done = false;
			if (stream._state === "closed") done = true;
			const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
			if (pullIntoDescriptor.readerType === "default") ReadableStreamFulfillReadRequest(stream, filledView, done);
			else ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
		}
		function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
			const bytesFilled = pullIntoDescriptor.bytesFilled;
			const elementSize = pullIntoDescriptor.elementSize;
			return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
		}
		function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
			controller._queue.push({
				buffer,
				byteOffset,
				byteLength
			});
			controller._queueTotalSize += byteLength;
		}
		function ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, buffer, byteOffset, byteLength) {
			let clonedChunk;
			try {
				clonedChunk = ArrayBufferSlice(buffer, byteOffset, byteOffset + byteLength);
			} catch (cloneE) {
				ReadableByteStreamControllerError(controller, cloneE);
				throw cloneE;
			}
			ReadableByteStreamControllerEnqueueChunkToQueue(controller, clonedChunk, 0, byteLength);
		}
		function ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstDescriptor) {
			if (firstDescriptor.bytesFilled > 0) ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, firstDescriptor.buffer, firstDescriptor.byteOffset, firstDescriptor.bytesFilled);
			ReadableByteStreamControllerShiftPendingPullInto(controller);
		}
		function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
			const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
			const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
			let totalBytesToCopyRemaining = maxBytesToCopy;
			let ready = false;
			const maxAlignedBytes = maxBytesFilled - maxBytesFilled % pullIntoDescriptor.elementSize;
			if (maxAlignedBytes >= pullIntoDescriptor.minimumFill) {
				totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
				ready = true;
			}
			const queue = controller._queue;
			while (totalBytesToCopyRemaining > 0) {
				const headOfQueue = queue.peek();
				const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
				const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
				CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
				if (headOfQueue.byteLength === bytesToCopy) queue.shift();
				else {
					headOfQueue.byteOffset += bytesToCopy;
					headOfQueue.byteLength -= bytesToCopy;
				}
				controller._queueTotalSize -= bytesToCopy;
				ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
				totalBytesToCopyRemaining -= bytesToCopy;
			}
			return ready;
		}
		function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
			pullIntoDescriptor.bytesFilled += size;
		}
		function ReadableByteStreamControllerHandleQueueDrain(controller) {
			if (controller._queueTotalSize === 0 && controller._closeRequested) {
				ReadableByteStreamControllerClearAlgorithms(controller);
				ReadableStreamClose(controller._controlledReadableByteStream);
			} else ReadableByteStreamControllerCallPullIfNeeded(controller);
		}
		function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
			if (controller._byobRequest === null) return;
			controller._byobRequest._associatedReadableByteStreamController = void 0;
			controller._byobRequest._view = null;
			controller._byobRequest = null;
		}
		function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
			while (controller._pendingPullIntos.length > 0) {
				if (controller._queueTotalSize === 0) return;
				const pullIntoDescriptor = controller._pendingPullIntos.peek();
				if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
					ReadableByteStreamControllerShiftPendingPullInto(controller);
					ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
				}
			}
		}
		function ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller) {
			const reader = controller._controlledReadableByteStream._reader;
			while (reader._readRequests.length > 0) {
				if (controller._queueTotalSize === 0) return;
				ReadableByteStreamControllerFillReadRequestFromQueue(controller, reader._readRequests.shift());
			}
		}
		function ReadableByteStreamControllerPullInto(controller, view, min, readIntoRequest) {
			const stream = controller._controlledReadableByteStream;
			const ctor = view.constructor;
			const elementSize = arrayBufferViewElementSize(ctor);
			const { byteOffset, byteLength } = view;
			const minimumFill = min * elementSize;
			let buffer;
			try {
				buffer = TransferArrayBuffer(view.buffer);
			} catch (e$1) {
				readIntoRequest._errorSteps(e$1);
				return;
			}
			const pullIntoDescriptor = {
				buffer,
				bufferByteLength: buffer.byteLength,
				byteOffset,
				byteLength,
				bytesFilled: 0,
				minimumFill,
				elementSize,
				viewConstructor: ctor,
				readerType: "byob"
			};
			if (controller._pendingPullIntos.length > 0) {
				controller._pendingPullIntos.push(pullIntoDescriptor);
				ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
				return;
			}
			if (stream._state === "closed") {
				const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
				readIntoRequest._closeSteps(emptyView);
				return;
			}
			if (controller._queueTotalSize > 0) {
				if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
					const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
					ReadableByteStreamControllerHandleQueueDrain(controller);
					readIntoRequest._chunkSteps(filledView);
					return;
				}
				if (controller._closeRequested) {
					const e$1 = /* @__PURE__ */ new TypeError("Insufficient bytes to fill elements in the given buffer");
					ReadableByteStreamControllerError(controller, e$1);
					readIntoRequest._errorSteps(e$1);
					return;
				}
			}
			controller._pendingPullIntos.push(pullIntoDescriptor);
			ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
			ReadableByteStreamControllerCallPullIfNeeded(controller);
		}
		function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
			if (firstDescriptor.readerType === "none") ReadableByteStreamControllerShiftPendingPullInto(controller);
			const stream = controller._controlledReadableByteStream;
			if (ReadableStreamHasBYOBReader(stream)) while (ReadableStreamGetNumReadIntoRequests(stream) > 0) ReadableByteStreamControllerCommitPullIntoDescriptor(stream, ReadableByteStreamControllerShiftPendingPullInto(controller));
		}
		function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
			ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
			if (pullIntoDescriptor.readerType === "none") {
				ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, pullIntoDescriptor);
				ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
				return;
			}
			if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.minimumFill) return;
			ReadableByteStreamControllerShiftPendingPullInto(controller);
			const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
			if (remainderSize > 0) {
				const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
				ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, pullIntoDescriptor.buffer, end - remainderSize, remainderSize);
			}
			pullIntoDescriptor.bytesFilled -= remainderSize;
			ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
			ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
		}
		function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
			const firstDescriptor = controller._pendingPullIntos.peek();
			ReadableByteStreamControllerInvalidateBYOBRequest(controller);
			if (controller._controlledReadableByteStream._state === "closed") ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor);
			else ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
			ReadableByteStreamControllerCallPullIfNeeded(controller);
		}
		function ReadableByteStreamControllerShiftPendingPullInto(controller) {
			return controller._pendingPullIntos.shift();
		}
		function ReadableByteStreamControllerShouldCallPull(controller) {
			const stream = controller._controlledReadableByteStream;
			if (stream._state !== "readable") return false;
			if (controller._closeRequested) return false;
			if (!controller._started) return false;
			if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) return true;
			if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) return true;
			if (ReadableByteStreamControllerGetDesiredSize(controller) > 0) return true;
			return false;
		}
		function ReadableByteStreamControllerClearAlgorithms(controller) {
			controller._pullAlgorithm = void 0;
			controller._cancelAlgorithm = void 0;
		}
		function ReadableByteStreamControllerClose(controller) {
			const stream = controller._controlledReadableByteStream;
			if (controller._closeRequested || stream._state !== "readable") return;
			if (controller._queueTotalSize > 0) {
				controller._closeRequested = true;
				return;
			}
			if (controller._pendingPullIntos.length > 0) {
				const firstPendingPullInto = controller._pendingPullIntos.peek();
				if (firstPendingPullInto.bytesFilled % firstPendingPullInto.elementSize !== 0) {
					const e$1 = /* @__PURE__ */ new TypeError("Insufficient bytes to fill elements in the given buffer");
					ReadableByteStreamControllerError(controller, e$1);
					throw e$1;
				}
			}
			ReadableByteStreamControllerClearAlgorithms(controller);
			ReadableStreamClose(stream);
		}
		function ReadableByteStreamControllerEnqueue(controller, chunk) {
			const stream = controller._controlledReadableByteStream;
			if (controller._closeRequested || stream._state !== "readable") return;
			const { buffer, byteOffset, byteLength } = chunk;
			if (IsDetachedBuffer(buffer)) throw new TypeError("chunk's buffer is detached and so cannot be enqueued");
			const transferredBuffer = TransferArrayBuffer(buffer);
			if (controller._pendingPullIntos.length > 0) {
				const firstPendingPullInto = controller._pendingPullIntos.peek();
				if (IsDetachedBuffer(firstPendingPullInto.buffer)) throw new TypeError("The BYOB request's buffer has been detached and so cannot be filled with an enqueued chunk");
				ReadableByteStreamControllerInvalidateBYOBRequest(controller);
				firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
				if (firstPendingPullInto.readerType === "none") ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstPendingPullInto);
			}
			if (ReadableStreamHasDefaultReader(stream)) {
				ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller);
				if (ReadableStreamGetNumReadRequests(stream) === 0) ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
				else {
					if (controller._pendingPullIntos.length > 0) ReadableByteStreamControllerShiftPendingPullInto(controller);
					ReadableStreamFulfillReadRequest(stream, new Uint8Array(transferredBuffer, byteOffset, byteLength), false);
				}
			} else if (ReadableStreamHasBYOBReader(stream)) {
				ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
				ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
			} else ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
			ReadableByteStreamControllerCallPullIfNeeded(controller);
		}
		function ReadableByteStreamControllerError(controller, e$1) {
			const stream = controller._controlledReadableByteStream;
			if (stream._state !== "readable") return;
			ReadableByteStreamControllerClearPendingPullIntos(controller);
			ResetQueue(controller);
			ReadableByteStreamControllerClearAlgorithms(controller);
			ReadableStreamError(stream, e$1);
		}
		function ReadableByteStreamControllerFillReadRequestFromQueue(controller, readRequest) {
			const entry = controller._queue.shift();
			controller._queueTotalSize -= entry.byteLength;
			ReadableByteStreamControllerHandleQueueDrain(controller);
			const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
			readRequest._chunkSteps(view);
		}
		function ReadableByteStreamControllerGetBYOBRequest(controller) {
			if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
				const firstDescriptor = controller._pendingPullIntos.peek();
				const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
				const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
				SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
				controller._byobRequest = byobRequest;
			}
			return controller._byobRequest;
		}
		function ReadableByteStreamControllerGetDesiredSize(controller) {
			const state = controller._controlledReadableByteStream._state;
			if (state === "errored") return null;
			if (state === "closed") return 0;
			return controller._strategyHWM - controller._queueTotalSize;
		}
		function ReadableByteStreamControllerRespond(controller, bytesWritten) {
			const firstDescriptor = controller._pendingPullIntos.peek();
			if (controller._controlledReadableByteStream._state === "closed") {
				if (bytesWritten !== 0) throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
			} else {
				if (bytesWritten === 0) throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
				if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) throw new RangeError("bytesWritten out of range");
			}
			firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
			ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
		}
		function ReadableByteStreamControllerRespondWithNewView(controller, view) {
			const firstDescriptor = controller._pendingPullIntos.peek();
			if (controller._controlledReadableByteStream._state === "closed") {
				if (view.byteLength !== 0) throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
			} else if (view.byteLength === 0) throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
			if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) throw new RangeError("The region specified by view does not match byobRequest");
			if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) throw new RangeError("The buffer of view has different capacity than byobRequest");
			if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) throw new RangeError("The region specified by view is larger than byobRequest");
			const viewByteLength = view.byteLength;
			firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
			ReadableByteStreamControllerRespondInternal(controller, viewByteLength);
		}
		function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
			controller._controlledReadableByteStream = stream;
			controller._pullAgain = false;
			controller._pulling = false;
			controller._byobRequest = null;
			controller._queue = controller._queueTotalSize = void 0;
			ResetQueue(controller);
			controller._closeRequested = false;
			controller._started = false;
			controller._strategyHWM = highWaterMark;
			controller._pullAlgorithm = pullAlgorithm;
			controller._cancelAlgorithm = cancelAlgorithm;
			controller._autoAllocateChunkSize = autoAllocateChunkSize;
			controller._pendingPullIntos = new SimpleQueue();
			stream._readableStreamController = controller;
			uponPromise(promiseResolvedWith(startAlgorithm()), () => {
				controller._started = true;
				ReadableByteStreamControllerCallPullIfNeeded(controller);
				return null;
			}, (r$1) => {
				ReadableByteStreamControllerError(controller, r$1);
				return null;
			});
		}
		function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
			const controller = Object.create(ReadableByteStreamController.prototype);
			let startAlgorithm;
			let pullAlgorithm;
			let cancelAlgorithm;
			if (underlyingByteSource.start !== void 0) startAlgorithm = () => underlyingByteSource.start(controller);
			else startAlgorithm = () => void 0;
			if (underlyingByteSource.pull !== void 0) pullAlgorithm = () => underlyingByteSource.pull(controller);
			else pullAlgorithm = () => promiseResolvedWith(void 0);
			if (underlyingByteSource.cancel !== void 0) cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
			else cancelAlgorithm = () => promiseResolvedWith(void 0);
			const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
			if (autoAllocateChunkSize === 0) throw new TypeError("autoAllocateChunkSize must be greater than 0");
			SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
		}
		function SetUpReadableStreamBYOBRequest(request, controller, view) {
			request._associatedReadableByteStreamController = controller;
			request._view = view;
		}
		function byobRequestBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
		}
		function byteStreamControllerBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
		}
		function convertReaderOptions(options, context) {
			assertDictionary(options, context);
			const mode = options === null || options === void 0 ? void 0 : options.mode;
			return { mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`) };
		}
		function convertReadableStreamReaderMode(mode, context) {
			mode = `${mode}`;
			if (mode !== "byob") throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
			return mode;
		}
		function convertByobReadOptions(options, context) {
			var _a$1;
			assertDictionary(options, context);
			return { min: convertUnsignedLongLongWithEnforceRange((_a$1 = options === null || options === void 0 ? void 0 : options.min) !== null && _a$1 !== void 0 ? _a$1 : 1, `${context} has member 'min' that`) };
		}
		function AcquireReadableStreamBYOBReader(stream) {
			return new ReadableStreamBYOBReader(stream);
		}
		function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
			stream._reader._readIntoRequests.push(readIntoRequest);
		}
		function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
			const readIntoRequest = stream._reader._readIntoRequests.shift();
			if (done) readIntoRequest._closeSteps(chunk);
			else readIntoRequest._chunkSteps(chunk);
		}
		function ReadableStreamGetNumReadIntoRequests(stream) {
			return stream._reader._readIntoRequests.length;
		}
		function ReadableStreamHasBYOBReader(stream) {
			const reader = stream._reader;
			if (reader === void 0) return false;
			if (!IsReadableStreamBYOBReader(reader)) return false;
			return true;
		}
		/**
		* A BYOB reader vended by a {@link ReadableStream}.
		*
		* @public
		*/
		class ReadableStreamBYOBReader {
			constructor(stream) {
				assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
				assertReadableStream(stream, "First parameter");
				if (IsReadableStreamLocked(stream)) throw new TypeError("This stream has already been locked for exclusive reading by another reader");
				if (!IsReadableByteStreamController(stream._readableStreamController)) throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
				ReadableStreamReaderGenericInitialize(this, stream);
				this._readIntoRequests = new SimpleQueue();
			}
			/**
			* Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
			* the reader's lock is released before the stream finishes closing.
			*/
			get closed() {
				if (!IsReadableStreamBYOBReader(this)) return promiseRejectedWith(byobReaderBrandCheckException("closed"));
				return this._closedPromise;
			}
			/**
			* If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
			*/
			cancel(reason = void 0) {
				if (!IsReadableStreamBYOBReader(this)) return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
				if (this._ownerReadableStream === void 0) return promiseRejectedWith(readerLockException("cancel"));
				return ReadableStreamReaderGenericCancel(this, reason);
			}
			read(view, rawOptions = {}) {
				if (!IsReadableStreamBYOBReader(this)) return promiseRejectedWith(byobReaderBrandCheckException("read"));
				if (!ArrayBuffer.isView(view)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("view must be an array buffer view"));
				if (view.byteLength === 0) return promiseRejectedWith(/* @__PURE__ */ new TypeError("view must have non-zero byteLength"));
				if (view.buffer.byteLength === 0) return promiseRejectedWith(/* @__PURE__ */ new TypeError(`view's buffer must have non-zero byteLength`));
				if (IsDetachedBuffer(view.buffer)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("view's buffer has been detached"));
				let options;
				try {
					options = convertByobReadOptions(rawOptions, "options");
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				const min = options.min;
				if (min === 0) return promiseRejectedWith(/* @__PURE__ */ new TypeError("options.min must be greater than 0"));
				if (!isDataView(view)) {
					if (min > view.length) return promiseRejectedWith(/* @__PURE__ */ new RangeError("options.min must be less than or equal to view's length"));
				} else if (min > view.byteLength) return promiseRejectedWith(/* @__PURE__ */ new RangeError("options.min must be less than or equal to view's byteLength"));
				if (this._ownerReadableStream === void 0) return promiseRejectedWith(readerLockException("read from"));
				let resolvePromise;
				let rejectPromise;
				const promise = newPromise((resolve, reject) => {
					resolvePromise = resolve;
					rejectPromise = reject;
				});
				ReadableStreamBYOBReaderRead(this, view, min, {
					_chunkSteps: (chunk) => resolvePromise({
						value: chunk,
						done: false
					}),
					_closeSteps: (chunk) => resolvePromise({
						value: chunk,
						done: true
					}),
					_errorSteps: (e$1) => rejectPromise(e$1)
				});
				return promise;
			}
			/**
			* Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
			* If the associated stream is errored when the lock is released, the reader will appear errored in the same way
			* from now on; otherwise, the reader will appear closed.
			*
			* A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
			* the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
			* do so will throw a `TypeError` and leave the reader locked to the stream.
			*/
			releaseLock() {
				if (!IsReadableStreamBYOBReader(this)) throw byobReaderBrandCheckException("releaseLock");
				if (this._ownerReadableStream === void 0) return;
				ReadableStreamBYOBReaderRelease(this);
			}
		}
		Object.defineProperties(ReadableStreamBYOBReader.prototype, {
			cancel: { enumerable: true },
			read: { enumerable: true },
			releaseLock: { enumerable: true },
			closed: { enumerable: true }
		});
		setFunctionName(ReadableStreamBYOBReader.prototype.cancel, "cancel");
		setFunctionName(ReadableStreamBYOBReader.prototype.read, "read");
		setFunctionName(ReadableStreamBYOBReader.prototype.releaseLock, "releaseLock");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableStreamBYOBReader.prototype, Symbol.toStringTag, {
			value: "ReadableStreamBYOBReader",
			configurable: true
		});
		function IsReadableStreamBYOBReader(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_readIntoRequests")) return false;
			return x$1 instanceof ReadableStreamBYOBReader;
		}
		function ReadableStreamBYOBReaderRead(reader, view, min, readIntoRequest) {
			const stream = reader._ownerReadableStream;
			stream._disturbed = true;
			if (stream._state === "errored") readIntoRequest._errorSteps(stream._storedError);
			else ReadableByteStreamControllerPullInto(stream._readableStreamController, view, min, readIntoRequest);
		}
		function ReadableStreamBYOBReaderRelease(reader) {
			ReadableStreamReaderGenericRelease(reader);
			ReadableStreamBYOBReaderErrorReadIntoRequests(reader, /* @__PURE__ */ new TypeError("Reader was released"));
		}
		function ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e$1) {
			const readIntoRequests = reader._readIntoRequests;
			reader._readIntoRequests = new SimpleQueue();
			readIntoRequests.forEach((readIntoRequest) => {
				readIntoRequest._errorSteps(e$1);
			});
		}
		function byobReaderBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
		}
		function ExtractHighWaterMark(strategy, defaultHWM) {
			const { highWaterMark } = strategy;
			if (highWaterMark === void 0) return defaultHWM;
			if (NumberIsNaN(highWaterMark) || highWaterMark < 0) throw new RangeError("Invalid highWaterMark");
			return highWaterMark;
		}
		function ExtractSizeAlgorithm(strategy) {
			const { size } = strategy;
			if (!size) return () => 1;
			return size;
		}
		function convertQueuingStrategy(init, context) {
			assertDictionary(init, context);
			const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
			const size = init === null || init === void 0 ? void 0 : init.size;
			return {
				highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
				size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
			};
		}
		function convertQueuingStrategySize(fn, context) {
			assertFunction(fn, context);
			return (chunk) => convertUnrestrictedDouble(fn(chunk));
		}
		function convertUnderlyingSink(original, context) {
			assertDictionary(original, context);
			const abort = original === null || original === void 0 ? void 0 : original.abort;
			const close = original === null || original === void 0 ? void 0 : original.close;
			const start = original === null || original === void 0 ? void 0 : original.start;
			const type = original === null || original === void 0 ? void 0 : original.type;
			const write = original === null || original === void 0 ? void 0 : original.write;
			return {
				abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
				close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
				start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
				write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
				type
			};
		}
		function convertUnderlyingSinkAbortCallback(fn, original, context) {
			assertFunction(fn, context);
			return (reason) => promiseCall(fn, original, [reason]);
		}
		function convertUnderlyingSinkCloseCallback(fn, original, context) {
			assertFunction(fn, context);
			return () => promiseCall(fn, original, []);
		}
		function convertUnderlyingSinkStartCallback(fn, original, context) {
			assertFunction(fn, context);
			return (controller) => reflectCall(fn, original, [controller]);
		}
		function convertUnderlyingSinkWriteCallback(fn, original, context) {
			assertFunction(fn, context);
			return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
		}
		function assertWritableStream(x$1, context) {
			if (!IsWritableStream(x$1)) throw new TypeError(`${context} is not a WritableStream.`);
		}
		function isAbortSignal$1(value) {
			if (typeof value !== "object" || value === null) return false;
			try {
				return typeof value.aborted === "boolean";
			} catch (_a$1) {
				return false;
			}
		}
		const supportsAbortController = typeof AbortController === "function";
		/**
		* Construct a new AbortController, if supported by the platform.
		*
		* @internal
		*/
		function createAbortController() {
			if (supportsAbortController) return new AbortController();
		}
		/**
		* A writable stream represents a destination for data, into which you can write.
		*
		* @public
		*/
		class WritableStream {
			constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
				if (rawUnderlyingSink === void 0) rawUnderlyingSink = null;
				else assertObject(rawUnderlyingSink, "First parameter");
				const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
				const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
				InitializeWritableStream(this);
				if (underlyingSink.type !== void 0) throw new RangeError("Invalid type is specified");
				const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
				const highWaterMark = ExtractHighWaterMark(strategy, 1);
				SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
			}
			/**
			* Returns whether or not the writable stream is locked to a writer.
			*/
			get locked() {
				if (!IsWritableStream(this)) throw streamBrandCheckException$2("locked");
				return IsWritableStreamLocked(this);
			}
			/**
			* Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
			* immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
			* mechanism of the underlying sink.
			*
			* The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
			* that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
			* the stream) if the stream is currently locked.
			*/
			abort(reason = void 0) {
				if (!IsWritableStream(this)) return promiseRejectedWith(streamBrandCheckException$2("abort"));
				if (IsWritableStreamLocked(this)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("Cannot abort a stream that already has a writer"));
				return WritableStreamAbort(this, reason);
			}
			/**
			* Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
			* close behavior. During this time any further attempts to write will fail (without erroring the stream).
			*
			* The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
			* successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
			* a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
			*/
			close() {
				if (!IsWritableStream(this)) return promiseRejectedWith(streamBrandCheckException$2("close"));
				if (IsWritableStreamLocked(this)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("Cannot close a stream that already has a writer"));
				if (WritableStreamCloseQueuedOrInFlight(this)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("Cannot close an already-closing stream"));
				return WritableStreamClose(this);
			}
			/**
			* Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
			* is locked, no other writer can be acquired until this one is released.
			*
			* This functionality is especially useful for creating abstractions that desire the ability to write to a stream
			* without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
			* the same time, which would cause the resulting written data to be unpredictable and probably useless.
			*/
			getWriter() {
				if (!IsWritableStream(this)) throw streamBrandCheckException$2("getWriter");
				return AcquireWritableStreamDefaultWriter(this);
			}
		}
		Object.defineProperties(WritableStream.prototype, {
			abort: { enumerable: true },
			close: { enumerable: true },
			getWriter: { enumerable: true },
			locked: { enumerable: true }
		});
		setFunctionName(WritableStream.prototype.abort, "abort");
		setFunctionName(WritableStream.prototype.close, "close");
		setFunctionName(WritableStream.prototype.getWriter, "getWriter");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(WritableStream.prototype, Symbol.toStringTag, {
			value: "WritableStream",
			configurable: true
		});
		function AcquireWritableStreamDefaultWriter(stream) {
			return new WritableStreamDefaultWriter(stream);
		}
		function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
			const stream = Object.create(WritableStream.prototype);
			InitializeWritableStream(stream);
			SetUpWritableStreamDefaultController(stream, Object.create(WritableStreamDefaultController.prototype), startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
			return stream;
		}
		function InitializeWritableStream(stream) {
			stream._state = "writable";
			stream._storedError = void 0;
			stream._writer = void 0;
			stream._writableStreamController = void 0;
			stream._writeRequests = new SimpleQueue();
			stream._inFlightWriteRequest = void 0;
			stream._closeRequest = void 0;
			stream._inFlightCloseRequest = void 0;
			stream._pendingAbortRequest = void 0;
			stream._backpressure = false;
		}
		function IsWritableStream(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_writableStreamController")) return false;
			return x$1 instanceof WritableStream;
		}
		function IsWritableStreamLocked(stream) {
			if (stream._writer === void 0) return false;
			return true;
		}
		function WritableStreamAbort(stream, reason) {
			var _a$1;
			if (stream._state === "closed" || stream._state === "errored") return promiseResolvedWith(void 0);
			stream._writableStreamController._abortReason = reason;
			(_a$1 = stream._writableStreamController._abortController) === null || _a$1 === void 0 || _a$1.abort(reason);
			const state = stream._state;
			if (state === "closed" || state === "errored") return promiseResolvedWith(void 0);
			if (stream._pendingAbortRequest !== void 0) return stream._pendingAbortRequest._promise;
			let wasAlreadyErroring = false;
			if (state === "erroring") {
				wasAlreadyErroring = true;
				reason = void 0;
			}
			const promise = newPromise((resolve, reject) => {
				stream._pendingAbortRequest = {
					_promise: void 0,
					_resolve: resolve,
					_reject: reject,
					_reason: reason,
					_wasAlreadyErroring: wasAlreadyErroring
				};
			});
			stream._pendingAbortRequest._promise = promise;
			if (!wasAlreadyErroring) WritableStreamStartErroring(stream, reason);
			return promise;
		}
		function WritableStreamClose(stream) {
			const state = stream._state;
			if (state === "closed" || state === "errored") return promiseRejectedWith(/* @__PURE__ */ new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
			const promise = newPromise((resolve, reject) => {
				stream._closeRequest = {
					_resolve: resolve,
					_reject: reject
				};
			});
			const writer = stream._writer;
			if (writer !== void 0 && stream._backpressure && state === "writable") defaultWriterReadyPromiseResolve(writer);
			WritableStreamDefaultControllerClose(stream._writableStreamController);
			return promise;
		}
		function WritableStreamAddWriteRequest(stream) {
			return newPromise((resolve, reject) => {
				const writeRequest = {
					_resolve: resolve,
					_reject: reject
				};
				stream._writeRequests.push(writeRequest);
			});
		}
		function WritableStreamDealWithRejection(stream, error) {
			if (stream._state === "writable") {
				WritableStreamStartErroring(stream, error);
				return;
			}
			WritableStreamFinishErroring(stream);
		}
		function WritableStreamStartErroring(stream, reason) {
			const controller = stream._writableStreamController;
			stream._state = "erroring";
			stream._storedError = reason;
			const writer = stream._writer;
			if (writer !== void 0) WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
			if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) WritableStreamFinishErroring(stream);
		}
		function WritableStreamFinishErroring(stream) {
			stream._state = "errored";
			stream._writableStreamController[ErrorSteps]();
			const storedError = stream._storedError;
			stream._writeRequests.forEach((writeRequest) => {
				writeRequest._reject(storedError);
			});
			stream._writeRequests = new SimpleQueue();
			if (stream._pendingAbortRequest === void 0) {
				WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
				return;
			}
			const abortRequest = stream._pendingAbortRequest;
			stream._pendingAbortRequest = void 0;
			if (abortRequest._wasAlreadyErroring) {
				abortRequest._reject(storedError);
				WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
				return;
			}
			uponPromise(stream._writableStreamController[AbortSteps](abortRequest._reason), () => {
				abortRequest._resolve();
				WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
				return null;
			}, (reason) => {
				abortRequest._reject(reason);
				WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
				return null;
			});
		}
		function WritableStreamFinishInFlightWrite(stream) {
			stream._inFlightWriteRequest._resolve(void 0);
			stream._inFlightWriteRequest = void 0;
		}
		function WritableStreamFinishInFlightWriteWithError(stream, error) {
			stream._inFlightWriteRequest._reject(error);
			stream._inFlightWriteRequest = void 0;
			WritableStreamDealWithRejection(stream, error);
		}
		function WritableStreamFinishInFlightClose(stream) {
			stream._inFlightCloseRequest._resolve(void 0);
			stream._inFlightCloseRequest = void 0;
			if (stream._state === "erroring") {
				stream._storedError = void 0;
				if (stream._pendingAbortRequest !== void 0) {
					stream._pendingAbortRequest._resolve();
					stream._pendingAbortRequest = void 0;
				}
			}
			stream._state = "closed";
			const writer = stream._writer;
			if (writer !== void 0) defaultWriterClosedPromiseResolve(writer);
		}
		function WritableStreamFinishInFlightCloseWithError(stream, error) {
			stream._inFlightCloseRequest._reject(error);
			stream._inFlightCloseRequest = void 0;
			if (stream._pendingAbortRequest !== void 0) {
				stream._pendingAbortRequest._reject(error);
				stream._pendingAbortRequest = void 0;
			}
			WritableStreamDealWithRejection(stream, error);
		}
		function WritableStreamCloseQueuedOrInFlight(stream) {
			if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) return false;
			return true;
		}
		function WritableStreamHasOperationMarkedInFlight(stream) {
			if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) return false;
			return true;
		}
		function WritableStreamMarkCloseRequestInFlight(stream) {
			stream._inFlightCloseRequest = stream._closeRequest;
			stream._closeRequest = void 0;
		}
		function WritableStreamMarkFirstWriteRequestInFlight(stream) {
			stream._inFlightWriteRequest = stream._writeRequests.shift();
		}
		function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
			if (stream._closeRequest !== void 0) {
				stream._closeRequest._reject(stream._storedError);
				stream._closeRequest = void 0;
			}
			const writer = stream._writer;
			if (writer !== void 0) defaultWriterClosedPromiseReject(writer, stream._storedError);
		}
		function WritableStreamUpdateBackpressure(stream, backpressure) {
			const writer = stream._writer;
			if (writer !== void 0 && backpressure !== stream._backpressure) if (backpressure) defaultWriterReadyPromiseReset(writer);
			else defaultWriterReadyPromiseResolve(writer);
			stream._backpressure = backpressure;
		}
		/**
		* A default writer vended by a {@link WritableStream}.
		*
		* @public
		*/
		class WritableStreamDefaultWriter {
			constructor(stream) {
				assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
				assertWritableStream(stream, "First parameter");
				if (IsWritableStreamLocked(stream)) throw new TypeError("This stream has already been locked for exclusive writing by another writer");
				this._ownerWritableStream = stream;
				stream._writer = this;
				const state = stream._state;
				if (state === "writable") {
					if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) defaultWriterReadyPromiseInitialize(this);
					else defaultWriterReadyPromiseInitializeAsResolved(this);
					defaultWriterClosedPromiseInitialize(this);
				} else if (state === "erroring") {
					defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
					defaultWriterClosedPromiseInitialize(this);
				} else if (state === "closed") {
					defaultWriterReadyPromiseInitializeAsResolved(this);
					defaultWriterClosedPromiseInitializeAsResolved(this);
				} else {
					const storedError = stream._storedError;
					defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
					defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
				}
			}
			/**
			* Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
			* the writer’s lock is released before the stream finishes closing.
			*/
			get closed() {
				if (!IsWritableStreamDefaultWriter(this)) return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
				return this._closedPromise;
			}
			/**
			* Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
			* A producer can use this information to determine the right amount of data to write.
			*
			* It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
			* queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
			* the writer’s lock is released.
			*/
			get desiredSize() {
				if (!IsWritableStreamDefaultWriter(this)) throw defaultWriterBrandCheckException("desiredSize");
				if (this._ownerWritableStream === void 0) throw defaultWriterLockException("desiredSize");
				return WritableStreamDefaultWriterGetDesiredSize(this);
			}
			/**
			* Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
			* from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
			* back to zero or below, the getter will return a new promise that stays pending until the next transition.
			*
			* If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
			* rejected.
			*/
			get ready() {
				if (!IsWritableStreamDefaultWriter(this)) return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
				return this._readyPromise;
			}
			/**
			* If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
			*/
			abort(reason = void 0) {
				if (!IsWritableStreamDefaultWriter(this)) return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
				if (this._ownerWritableStream === void 0) return promiseRejectedWith(defaultWriterLockException("abort"));
				return WritableStreamDefaultWriterAbort(this, reason);
			}
			/**
			* If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
			*/
			close() {
				if (!IsWritableStreamDefaultWriter(this)) return promiseRejectedWith(defaultWriterBrandCheckException("close"));
				const stream = this._ownerWritableStream;
				if (stream === void 0) return promiseRejectedWith(defaultWriterLockException("close"));
				if (WritableStreamCloseQueuedOrInFlight(stream)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("Cannot close an already-closing stream"));
				return WritableStreamDefaultWriterClose(this);
			}
			/**
			* Releases the writer’s lock on the corresponding stream. After the lock is released, the writer is no longer active.
			* If the associated stream is errored when the lock is released, the writer will appear errored in the same way from
			* now on; otherwise, the writer will appear closed.
			*
			* Note that the lock can still be released even if some ongoing writes have not yet finished (i.e. even if the
			* promises returned from previous calls to {@link WritableStreamDefaultWriter.write | write()} have not yet settled).
			* It’s not necessary to hold the lock on the writer for the duration of the write; the lock instead simply prevents
			* other producers from writing in an interleaved manner.
			*/
			releaseLock() {
				if (!IsWritableStreamDefaultWriter(this)) throw defaultWriterBrandCheckException("releaseLock");
				if (this._ownerWritableStream === void 0) return;
				WritableStreamDefaultWriterRelease(this);
			}
			write(chunk = void 0) {
				if (!IsWritableStreamDefaultWriter(this)) return promiseRejectedWith(defaultWriterBrandCheckException("write"));
				if (this._ownerWritableStream === void 0) return promiseRejectedWith(defaultWriterLockException("write to"));
				return WritableStreamDefaultWriterWrite(this, chunk);
			}
		}
		Object.defineProperties(WritableStreamDefaultWriter.prototype, {
			abort: { enumerable: true },
			close: { enumerable: true },
			releaseLock: { enumerable: true },
			write: { enumerable: true },
			closed: { enumerable: true },
			desiredSize: { enumerable: true },
			ready: { enumerable: true }
		});
		setFunctionName(WritableStreamDefaultWriter.prototype.abort, "abort");
		setFunctionName(WritableStreamDefaultWriter.prototype.close, "close");
		setFunctionName(WritableStreamDefaultWriter.prototype.releaseLock, "releaseLock");
		setFunctionName(WritableStreamDefaultWriter.prototype.write, "write");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(WritableStreamDefaultWriter.prototype, Symbol.toStringTag, {
			value: "WritableStreamDefaultWriter",
			configurable: true
		});
		function IsWritableStreamDefaultWriter(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_ownerWritableStream")) return false;
			return x$1 instanceof WritableStreamDefaultWriter;
		}
		function WritableStreamDefaultWriterAbort(writer, reason) {
			const stream = writer._ownerWritableStream;
			return WritableStreamAbort(stream, reason);
		}
		function WritableStreamDefaultWriterClose(writer) {
			const stream = writer._ownerWritableStream;
			return WritableStreamClose(stream);
		}
		function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
			const stream = writer._ownerWritableStream;
			const state = stream._state;
			if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") return promiseResolvedWith(void 0);
			if (state === "errored") return promiseRejectedWith(stream._storedError);
			return WritableStreamDefaultWriterClose(writer);
		}
		function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error) {
			if (writer._closedPromiseState === "pending") defaultWriterClosedPromiseReject(writer, error);
			else defaultWriterClosedPromiseResetToRejected(writer, error);
		}
		function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error) {
			if (writer._readyPromiseState === "pending") defaultWriterReadyPromiseReject(writer, error);
			else defaultWriterReadyPromiseResetToRejected(writer, error);
		}
		function WritableStreamDefaultWriterGetDesiredSize(writer) {
			const stream = writer._ownerWritableStream;
			const state = stream._state;
			if (state === "errored" || state === "erroring") return null;
			if (state === "closed") return 0;
			return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
		}
		function WritableStreamDefaultWriterRelease(writer) {
			const stream = writer._ownerWritableStream;
			const releasedError = /* @__PURE__ */ new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
			WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
			WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
			stream._writer = void 0;
			writer._ownerWritableStream = void 0;
		}
		function WritableStreamDefaultWriterWrite(writer, chunk) {
			const stream = writer._ownerWritableStream;
			const controller = stream._writableStreamController;
			const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
			if (stream !== writer._ownerWritableStream) return promiseRejectedWith(defaultWriterLockException("write to"));
			const state = stream._state;
			if (state === "errored") return promiseRejectedWith(stream._storedError);
			if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") return promiseRejectedWith(/* @__PURE__ */ new TypeError("The stream is closing or closed and cannot be written to"));
			if (state === "erroring") return promiseRejectedWith(stream._storedError);
			const promise = WritableStreamAddWriteRequest(stream);
			WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
			return promise;
		}
		const closeSentinel = {};
		/**
		* Allows control of a {@link WritableStream | writable stream}'s state and internal queue.
		*
		* @public
		*/
		class WritableStreamDefaultController {
			constructor() {
				throw new TypeError("Illegal constructor");
			}
			/**
			* The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
			*
			* @deprecated
			*  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
			*  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
			*/
			get abortReason() {
				if (!IsWritableStreamDefaultController(this)) throw defaultControllerBrandCheckException$2("abortReason");
				return this._abortReason;
			}
			/**
			* An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
			*/
			get signal() {
				if (!IsWritableStreamDefaultController(this)) throw defaultControllerBrandCheckException$2("signal");
				if (this._abortController === void 0) throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
				return this._abortController.signal;
			}
			/**
			* Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
			*
			* This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
			* sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
			* normal lifecycle of interactions with the underlying sink.
			*/
			error(e$1 = void 0) {
				if (!IsWritableStreamDefaultController(this)) throw defaultControllerBrandCheckException$2("error");
				if (this._controlledWritableStream._state !== "writable") return;
				WritableStreamDefaultControllerError(this, e$1);
			}
			/** @internal */
			[AbortSteps](reason) {
				const result = this._abortAlgorithm(reason);
				WritableStreamDefaultControllerClearAlgorithms(this);
				return result;
			}
			/** @internal */
			[ErrorSteps]() {
				ResetQueue(this);
			}
		}
		Object.defineProperties(WritableStreamDefaultController.prototype, {
			abortReason: { enumerable: true },
			signal: { enumerable: true },
			error: { enumerable: true }
		});
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(WritableStreamDefaultController.prototype, Symbol.toStringTag, {
			value: "WritableStreamDefaultController",
			configurable: true
		});
		function IsWritableStreamDefaultController(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_controlledWritableStream")) return false;
			return x$1 instanceof WritableStreamDefaultController;
		}
		function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
			controller._controlledWritableStream = stream;
			stream._writableStreamController = controller;
			controller._queue = void 0;
			controller._queueTotalSize = void 0;
			ResetQueue(controller);
			controller._abortReason = void 0;
			controller._abortController = createAbortController();
			controller._started = false;
			controller._strategySizeAlgorithm = sizeAlgorithm;
			controller._strategyHWM = highWaterMark;
			controller._writeAlgorithm = writeAlgorithm;
			controller._closeAlgorithm = closeAlgorithm;
			controller._abortAlgorithm = abortAlgorithm;
			WritableStreamUpdateBackpressure(stream, WritableStreamDefaultControllerGetBackpressure(controller));
			uponPromise(promiseResolvedWith(startAlgorithm()), () => {
				controller._started = true;
				WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
				return null;
			}, (r$1) => {
				controller._started = true;
				WritableStreamDealWithRejection(stream, r$1);
				return null;
			});
		}
		function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
			const controller = Object.create(WritableStreamDefaultController.prototype);
			let startAlgorithm;
			let writeAlgorithm;
			let closeAlgorithm;
			let abortAlgorithm;
			if (underlyingSink.start !== void 0) startAlgorithm = () => underlyingSink.start(controller);
			else startAlgorithm = () => void 0;
			if (underlyingSink.write !== void 0) writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
			else writeAlgorithm = () => promiseResolvedWith(void 0);
			if (underlyingSink.close !== void 0) closeAlgorithm = () => underlyingSink.close();
			else closeAlgorithm = () => promiseResolvedWith(void 0);
			if (underlyingSink.abort !== void 0) abortAlgorithm = (reason) => underlyingSink.abort(reason);
			else abortAlgorithm = () => promiseResolvedWith(void 0);
			SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
		}
		function WritableStreamDefaultControllerClearAlgorithms(controller) {
			controller._writeAlgorithm = void 0;
			controller._closeAlgorithm = void 0;
			controller._abortAlgorithm = void 0;
			controller._strategySizeAlgorithm = void 0;
		}
		function WritableStreamDefaultControllerClose(controller) {
			EnqueueValueWithSize(controller, closeSentinel, 0);
			WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		}
		function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
			try {
				return controller._strategySizeAlgorithm(chunk);
			} catch (chunkSizeE) {
				WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
				return 1;
			}
		}
		function WritableStreamDefaultControllerGetDesiredSize(controller) {
			return controller._strategyHWM - controller._queueTotalSize;
		}
		function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
			try {
				EnqueueValueWithSize(controller, chunk, chunkSize);
			} catch (enqueueE) {
				WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
				return;
			}
			const stream = controller._controlledWritableStream;
			if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") WritableStreamUpdateBackpressure(stream, WritableStreamDefaultControllerGetBackpressure(controller));
			WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
		}
		function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
			const stream = controller._controlledWritableStream;
			if (!controller._started) return;
			if (stream._inFlightWriteRequest !== void 0) return;
			if (stream._state === "erroring") {
				WritableStreamFinishErroring(stream);
				return;
			}
			if (controller._queue.length === 0) return;
			const value = PeekQueueValue(controller);
			if (value === closeSentinel) WritableStreamDefaultControllerProcessClose(controller);
			else WritableStreamDefaultControllerProcessWrite(controller, value);
		}
		function WritableStreamDefaultControllerErrorIfNeeded(controller, error) {
			if (controller._controlledWritableStream._state === "writable") WritableStreamDefaultControllerError(controller, error);
		}
		function WritableStreamDefaultControllerProcessClose(controller) {
			const stream = controller._controlledWritableStream;
			WritableStreamMarkCloseRequestInFlight(stream);
			DequeueValue(controller);
			const sinkClosePromise = controller._closeAlgorithm();
			WritableStreamDefaultControllerClearAlgorithms(controller);
			uponPromise(sinkClosePromise, () => {
				WritableStreamFinishInFlightClose(stream);
				return null;
			}, (reason) => {
				WritableStreamFinishInFlightCloseWithError(stream, reason);
				return null;
			});
		}
		function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
			const stream = controller._controlledWritableStream;
			WritableStreamMarkFirstWriteRequestInFlight(stream);
			uponPromise(controller._writeAlgorithm(chunk), () => {
				WritableStreamFinishInFlightWrite(stream);
				const state = stream._state;
				DequeueValue(controller);
				if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") WritableStreamUpdateBackpressure(stream, WritableStreamDefaultControllerGetBackpressure(controller));
				WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
				return null;
			}, (reason) => {
				if (stream._state === "writable") WritableStreamDefaultControllerClearAlgorithms(controller);
				WritableStreamFinishInFlightWriteWithError(stream, reason);
				return null;
			});
		}
		function WritableStreamDefaultControllerGetBackpressure(controller) {
			return WritableStreamDefaultControllerGetDesiredSize(controller) <= 0;
		}
		function WritableStreamDefaultControllerError(controller, error) {
			const stream = controller._controlledWritableStream;
			WritableStreamDefaultControllerClearAlgorithms(controller);
			WritableStreamStartErroring(stream, error);
		}
		function streamBrandCheckException$2(name) {
			return /* @__PURE__ */ new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
		}
		function defaultControllerBrandCheckException$2(name) {
			return /* @__PURE__ */ new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
		}
		function defaultWriterBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
		}
		function defaultWriterLockException(name) {
			return /* @__PURE__ */ new TypeError("Cannot " + name + " a stream using a released writer");
		}
		function defaultWriterClosedPromiseInitialize(writer) {
			writer._closedPromise = newPromise((resolve, reject) => {
				writer._closedPromise_resolve = resolve;
				writer._closedPromise_reject = reject;
				writer._closedPromiseState = "pending";
			});
		}
		function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
			defaultWriterClosedPromiseInitialize(writer);
			defaultWriterClosedPromiseReject(writer, reason);
		}
		function defaultWriterClosedPromiseInitializeAsResolved(writer) {
			defaultWriterClosedPromiseInitialize(writer);
			defaultWriterClosedPromiseResolve(writer);
		}
		function defaultWriterClosedPromiseReject(writer, reason) {
			if (writer._closedPromise_reject === void 0) return;
			setPromiseIsHandledToTrue(writer._closedPromise);
			writer._closedPromise_reject(reason);
			writer._closedPromise_resolve = void 0;
			writer._closedPromise_reject = void 0;
			writer._closedPromiseState = "rejected";
		}
		function defaultWriterClosedPromiseResetToRejected(writer, reason) {
			defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
		}
		function defaultWriterClosedPromiseResolve(writer) {
			if (writer._closedPromise_resolve === void 0) return;
			writer._closedPromise_resolve(void 0);
			writer._closedPromise_resolve = void 0;
			writer._closedPromise_reject = void 0;
			writer._closedPromiseState = "resolved";
		}
		function defaultWriterReadyPromiseInitialize(writer) {
			writer._readyPromise = newPromise((resolve, reject) => {
				writer._readyPromise_resolve = resolve;
				writer._readyPromise_reject = reject;
			});
			writer._readyPromiseState = "pending";
		}
		function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
			defaultWriterReadyPromiseInitialize(writer);
			defaultWriterReadyPromiseReject(writer, reason);
		}
		function defaultWriterReadyPromiseInitializeAsResolved(writer) {
			defaultWriterReadyPromiseInitialize(writer);
			defaultWriterReadyPromiseResolve(writer);
		}
		function defaultWriterReadyPromiseReject(writer, reason) {
			if (writer._readyPromise_reject === void 0) return;
			setPromiseIsHandledToTrue(writer._readyPromise);
			writer._readyPromise_reject(reason);
			writer._readyPromise_resolve = void 0;
			writer._readyPromise_reject = void 0;
			writer._readyPromiseState = "rejected";
		}
		function defaultWriterReadyPromiseReset(writer) {
			defaultWriterReadyPromiseInitialize(writer);
		}
		function defaultWriterReadyPromiseResetToRejected(writer, reason) {
			defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
		}
		function defaultWriterReadyPromiseResolve(writer) {
			if (writer._readyPromise_resolve === void 0) return;
			writer._readyPromise_resolve(void 0);
			writer._readyPromise_resolve = void 0;
			writer._readyPromise_reject = void 0;
			writer._readyPromiseState = "fulfilled";
		}
		function getGlobals() {
			if (typeof globalThis !== "undefined") return globalThis;
			else if (typeof self !== "undefined") return self;
			else if (typeof global !== "undefined") return global;
		}
		const globals = getGlobals();
		function isDOMExceptionConstructor(ctor) {
			if (!(typeof ctor === "function" || typeof ctor === "object")) return false;
			if (ctor.name !== "DOMException") return false;
			try {
				new ctor();
				return true;
			} catch (_a$1) {
				return false;
			}
		}
		/**
		* Support:
		* - Web browsers
		* - Node 18 and higher (https://github.com/nodejs/node/commit/e4b1fb5e6422c1ff151234bb9de792d45dd88d87)
		*/
		function getFromGlobal() {
			const ctor = globals === null || globals === void 0 ? void 0 : globals.DOMException;
			return isDOMExceptionConstructor(ctor) ? ctor : void 0;
		}
		/**
		* Support:
		* - All platforms
		*/
		function createPolyfill() {
			const ctor = function DOMException$2(message, name) {
				this.message = message || "";
				this.name = name || "Error";
				if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
			};
			setFunctionName(ctor, "DOMException");
			ctor.prototype = Object.create(Error.prototype);
			Object.defineProperty(ctor.prototype, "constructor", {
				value: ctor,
				writable: true,
				configurable: true
			});
			return ctor;
		}
		const DOMException$1 = getFromGlobal() || createPolyfill();
		function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
			const reader = AcquireReadableStreamDefaultReader(source);
			const writer = AcquireWritableStreamDefaultWriter(dest);
			source._disturbed = true;
			let shuttingDown = false;
			let currentWrite = promiseResolvedWith(void 0);
			return newPromise((resolve, reject) => {
				let abortAlgorithm;
				if (signal !== void 0) {
					abortAlgorithm = () => {
						const error = signal.reason !== void 0 ? signal.reason : new DOMException$1("Aborted", "AbortError");
						const actions = [];
						if (!preventAbort) actions.push(() => {
							if (dest._state === "writable") return WritableStreamAbort(dest, error);
							return promiseResolvedWith(void 0);
						});
						if (!preventCancel) actions.push(() => {
							if (source._state === "readable") return ReadableStreamCancel(source, error);
							return promiseResolvedWith(void 0);
						});
						shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error);
					};
					if (signal.aborted) {
						abortAlgorithm();
						return;
					}
					signal.addEventListener("abort", abortAlgorithm);
				}
				function pipeLoop() {
					return newPromise((resolveLoop, rejectLoop) => {
						function next(done) {
							if (done) resolveLoop();
							else PerformPromiseThen(pipeStep(), next, rejectLoop);
						}
						next(false);
					});
				}
				function pipeStep() {
					if (shuttingDown) return promiseResolvedWith(true);
					return PerformPromiseThen(writer._readyPromise, () => {
						return newPromise((resolveRead, rejectRead) => {
							ReadableStreamDefaultReaderRead(reader, {
								_chunkSteps: (chunk) => {
									currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop);
									resolveRead(false);
								},
								_closeSteps: () => resolveRead(true),
								_errorSteps: rejectRead
							});
						});
					});
				}
				isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
					if (!preventAbort) shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
					else shutdown(true, storedError);
					return null;
				});
				isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
					if (!preventCancel) shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
					else shutdown(true, storedError);
					return null;
				});
				isOrBecomesClosed(source, reader._closedPromise, () => {
					if (!preventClose) shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
					else shutdown();
					return null;
				});
				if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
					const destClosed = /* @__PURE__ */ new TypeError("the destination writable stream closed before all data could be piped to it");
					if (!preventCancel) shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
					else shutdown(true, destClosed);
				}
				setPromiseIsHandledToTrue(pipeLoop());
				function waitForWritesToFinish() {
					const oldCurrentWrite = currentWrite;
					return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
				}
				function isOrBecomesErrored(stream, promise, action) {
					if (stream._state === "errored") action(stream._storedError);
					else uponRejection(promise, action);
				}
				function isOrBecomesClosed(stream, promise, action) {
					if (stream._state === "closed") action();
					else uponFulfillment(promise, action);
				}
				function shutdownWithAction(action, originalIsError, originalError) {
					if (shuttingDown) return;
					shuttingDown = true;
					if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) uponFulfillment(waitForWritesToFinish(), doTheRest);
					else doTheRest();
					function doTheRest() {
						uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
						return null;
					}
				}
				function shutdown(isError, error) {
					if (shuttingDown) return;
					shuttingDown = true;
					if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error));
					else finalize(isError, error);
				}
				function finalize(isError, error) {
					WritableStreamDefaultWriterRelease(writer);
					ReadableStreamReaderGenericRelease(reader);
					if (signal !== void 0) signal.removeEventListener("abort", abortAlgorithm);
					if (isError) reject(error);
					else resolve(void 0);
					return null;
				}
			});
		}
		/**
		* Allows control of a {@link ReadableStream | readable stream}'s state and internal queue.
		*
		* @public
		*/
		class ReadableStreamDefaultController {
			constructor() {
				throw new TypeError("Illegal constructor");
			}
			/**
			* Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
			* over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
			*/
			get desiredSize() {
				if (!IsReadableStreamDefaultController(this)) throw defaultControllerBrandCheckException$1("desiredSize");
				return ReadableStreamDefaultControllerGetDesiredSize(this);
			}
			/**
			* Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
			* the stream, but once those are read, the stream will become closed.
			*/
			close() {
				if (!IsReadableStreamDefaultController(this)) throw defaultControllerBrandCheckException$1("close");
				if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) throw new TypeError("The stream is not in a state that permits close");
				ReadableStreamDefaultControllerClose(this);
			}
			enqueue(chunk = void 0) {
				if (!IsReadableStreamDefaultController(this)) throw defaultControllerBrandCheckException$1("enqueue");
				if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) throw new TypeError("The stream is not in a state that permits enqueue");
				return ReadableStreamDefaultControllerEnqueue(this, chunk);
			}
			/**
			* Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
			*/
			error(e$1 = void 0) {
				if (!IsReadableStreamDefaultController(this)) throw defaultControllerBrandCheckException$1("error");
				ReadableStreamDefaultControllerError(this, e$1);
			}
			/** @internal */
			[CancelSteps](reason) {
				ResetQueue(this);
				const result = this._cancelAlgorithm(reason);
				ReadableStreamDefaultControllerClearAlgorithms(this);
				return result;
			}
			/** @internal */
			[PullSteps](readRequest) {
				const stream = this._controlledReadableStream;
				if (this._queue.length > 0) {
					const chunk = DequeueValue(this);
					if (this._closeRequested && this._queue.length === 0) {
						ReadableStreamDefaultControllerClearAlgorithms(this);
						ReadableStreamClose(stream);
					} else ReadableStreamDefaultControllerCallPullIfNeeded(this);
					readRequest._chunkSteps(chunk);
				} else {
					ReadableStreamAddReadRequest(stream, readRequest);
					ReadableStreamDefaultControllerCallPullIfNeeded(this);
				}
			}
			/** @internal */
			[ReleaseSteps]() {}
		}
		Object.defineProperties(ReadableStreamDefaultController.prototype, {
			close: { enumerable: true },
			enqueue: { enumerable: true },
			error: { enumerable: true },
			desiredSize: { enumerable: true }
		});
		setFunctionName(ReadableStreamDefaultController.prototype.close, "close");
		setFunctionName(ReadableStreamDefaultController.prototype.enqueue, "enqueue");
		setFunctionName(ReadableStreamDefaultController.prototype.error, "error");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableStreamDefaultController.prototype, Symbol.toStringTag, {
			value: "ReadableStreamDefaultController",
			configurable: true
		});
		function IsReadableStreamDefaultController(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_controlledReadableStream")) return false;
			return x$1 instanceof ReadableStreamDefaultController;
		}
		function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
			if (!ReadableStreamDefaultControllerShouldCallPull(controller)) return;
			if (controller._pulling) {
				controller._pullAgain = true;
				return;
			}
			controller._pulling = true;
			uponPromise(controller._pullAlgorithm(), () => {
				controller._pulling = false;
				if (controller._pullAgain) {
					controller._pullAgain = false;
					ReadableStreamDefaultControllerCallPullIfNeeded(controller);
				}
				return null;
			}, (e$1) => {
				ReadableStreamDefaultControllerError(controller, e$1);
				return null;
			});
		}
		function ReadableStreamDefaultControllerShouldCallPull(controller) {
			const stream = controller._controlledReadableStream;
			if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) return false;
			if (!controller._started) return false;
			if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) return true;
			if (ReadableStreamDefaultControllerGetDesiredSize(controller) > 0) return true;
			return false;
		}
		function ReadableStreamDefaultControllerClearAlgorithms(controller) {
			controller._pullAlgorithm = void 0;
			controller._cancelAlgorithm = void 0;
			controller._strategySizeAlgorithm = void 0;
		}
		function ReadableStreamDefaultControllerClose(controller) {
			if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) return;
			const stream = controller._controlledReadableStream;
			controller._closeRequested = true;
			if (controller._queue.length === 0) {
				ReadableStreamDefaultControllerClearAlgorithms(controller);
				ReadableStreamClose(stream);
			}
		}
		function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
			if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) return;
			const stream = controller._controlledReadableStream;
			if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) ReadableStreamFulfillReadRequest(stream, chunk, false);
			else {
				let chunkSize;
				try {
					chunkSize = controller._strategySizeAlgorithm(chunk);
				} catch (chunkSizeE) {
					ReadableStreamDefaultControllerError(controller, chunkSizeE);
					throw chunkSizeE;
				}
				try {
					EnqueueValueWithSize(controller, chunk, chunkSize);
				} catch (enqueueE) {
					ReadableStreamDefaultControllerError(controller, enqueueE);
					throw enqueueE;
				}
			}
			ReadableStreamDefaultControllerCallPullIfNeeded(controller);
		}
		function ReadableStreamDefaultControllerError(controller, e$1) {
			const stream = controller._controlledReadableStream;
			if (stream._state !== "readable") return;
			ResetQueue(controller);
			ReadableStreamDefaultControllerClearAlgorithms(controller);
			ReadableStreamError(stream, e$1);
		}
		function ReadableStreamDefaultControllerGetDesiredSize(controller) {
			const state = controller._controlledReadableStream._state;
			if (state === "errored") return null;
			if (state === "closed") return 0;
			return controller._strategyHWM - controller._queueTotalSize;
		}
		function ReadableStreamDefaultControllerHasBackpressure(controller) {
			if (ReadableStreamDefaultControllerShouldCallPull(controller)) return false;
			return true;
		}
		function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
			const state = controller._controlledReadableStream._state;
			if (!controller._closeRequested && state === "readable") return true;
			return false;
		}
		function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
			controller._controlledReadableStream = stream;
			controller._queue = void 0;
			controller._queueTotalSize = void 0;
			ResetQueue(controller);
			controller._started = false;
			controller._closeRequested = false;
			controller._pullAgain = false;
			controller._pulling = false;
			controller._strategySizeAlgorithm = sizeAlgorithm;
			controller._strategyHWM = highWaterMark;
			controller._pullAlgorithm = pullAlgorithm;
			controller._cancelAlgorithm = cancelAlgorithm;
			stream._readableStreamController = controller;
			uponPromise(promiseResolvedWith(startAlgorithm()), () => {
				controller._started = true;
				ReadableStreamDefaultControllerCallPullIfNeeded(controller);
				return null;
			}, (r$1) => {
				ReadableStreamDefaultControllerError(controller, r$1);
				return null;
			});
		}
		function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
			const controller = Object.create(ReadableStreamDefaultController.prototype);
			let startAlgorithm;
			let pullAlgorithm;
			let cancelAlgorithm;
			if (underlyingSource.start !== void 0) startAlgorithm = () => underlyingSource.start(controller);
			else startAlgorithm = () => void 0;
			if (underlyingSource.pull !== void 0) pullAlgorithm = () => underlyingSource.pull(controller);
			else pullAlgorithm = () => promiseResolvedWith(void 0);
			if (underlyingSource.cancel !== void 0) cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
			else cancelAlgorithm = () => promiseResolvedWith(void 0);
			SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
		}
		function defaultControllerBrandCheckException$1(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
		}
		function ReadableStreamTee(stream, cloneForBranch2) {
			if (IsReadableByteStreamController(stream._readableStreamController)) return ReadableByteStreamTee(stream);
			return ReadableStreamDefaultTee(stream);
		}
		function ReadableStreamDefaultTee(stream, cloneForBranch2) {
			const reader = AcquireReadableStreamDefaultReader(stream);
			let reading = false;
			let readAgain = false;
			let canceled1 = false;
			let canceled2 = false;
			let reason1;
			let reason2;
			let branch1;
			let branch2;
			let resolveCancelPromise;
			const cancelPromise = newPromise((resolve) => {
				resolveCancelPromise = resolve;
			});
			function pullAlgorithm() {
				if (reading) {
					readAgain = true;
					return promiseResolvedWith(void 0);
				}
				reading = true;
				ReadableStreamDefaultReaderRead(reader, {
					_chunkSteps: (chunk) => {
						_queueMicrotask(() => {
							readAgain = false;
							const chunk1 = chunk;
							const chunk2 = chunk;
							if (!canceled1) ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
							if (!canceled2) ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
							reading = false;
							if (readAgain) pullAlgorithm();
						});
					},
					_closeSteps: () => {
						reading = false;
						if (!canceled1) ReadableStreamDefaultControllerClose(branch1._readableStreamController);
						if (!canceled2) ReadableStreamDefaultControllerClose(branch2._readableStreamController);
						if (!canceled1 || !canceled2) resolveCancelPromise(void 0);
					},
					_errorSteps: () => {
						reading = false;
					}
				});
				return promiseResolvedWith(void 0);
			}
			function cancel1Algorithm(reason) {
				canceled1 = true;
				reason1 = reason;
				if (canceled2) {
					const cancelResult = ReadableStreamCancel(stream, CreateArrayFromList([reason1, reason2]));
					resolveCancelPromise(cancelResult);
				}
				return cancelPromise;
			}
			function cancel2Algorithm(reason) {
				canceled2 = true;
				reason2 = reason;
				if (canceled1) {
					const cancelResult = ReadableStreamCancel(stream, CreateArrayFromList([reason1, reason2]));
					resolveCancelPromise(cancelResult);
				}
				return cancelPromise;
			}
			function startAlgorithm() {}
			branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
			branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
			uponRejection(reader._closedPromise, (r$1) => {
				ReadableStreamDefaultControllerError(branch1._readableStreamController, r$1);
				ReadableStreamDefaultControllerError(branch2._readableStreamController, r$1);
				if (!canceled1 || !canceled2) resolveCancelPromise(void 0);
				return null;
			});
			return [branch1, branch2];
		}
		function ReadableByteStreamTee(stream) {
			let reader = AcquireReadableStreamDefaultReader(stream);
			let reading = false;
			let readAgainForBranch1 = false;
			let readAgainForBranch2 = false;
			let canceled1 = false;
			let canceled2 = false;
			let reason1;
			let reason2;
			let branch1;
			let branch2;
			let resolveCancelPromise;
			const cancelPromise = newPromise((resolve) => {
				resolveCancelPromise = resolve;
			});
			function forwardReaderError(thisReader) {
				uponRejection(thisReader._closedPromise, (r$1) => {
					if (thisReader !== reader) return null;
					ReadableByteStreamControllerError(branch1._readableStreamController, r$1);
					ReadableByteStreamControllerError(branch2._readableStreamController, r$1);
					if (!canceled1 || !canceled2) resolveCancelPromise(void 0);
					return null;
				});
			}
			function pullWithDefaultReader() {
				if (IsReadableStreamBYOBReader(reader)) {
					ReadableStreamReaderGenericRelease(reader);
					reader = AcquireReadableStreamDefaultReader(stream);
					forwardReaderError(reader);
				}
				ReadableStreamDefaultReaderRead(reader, {
					_chunkSteps: (chunk) => {
						_queueMicrotask(() => {
							readAgainForBranch1 = false;
							readAgainForBranch2 = false;
							const chunk1 = chunk;
							let chunk2 = chunk;
							if (!canceled1 && !canceled2) try {
								chunk2 = CloneAsUint8Array(chunk);
							} catch (cloneE) {
								ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
								ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
								resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
								return;
							}
							if (!canceled1) ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
							if (!canceled2) ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
							reading = false;
							if (readAgainForBranch1) pull1Algorithm();
							else if (readAgainForBranch2) pull2Algorithm();
						});
					},
					_closeSteps: () => {
						reading = false;
						if (!canceled1) ReadableByteStreamControllerClose(branch1._readableStreamController);
						if (!canceled2) ReadableByteStreamControllerClose(branch2._readableStreamController);
						if (branch1._readableStreamController._pendingPullIntos.length > 0) ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
						if (branch2._readableStreamController._pendingPullIntos.length > 0) ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
						if (!canceled1 || !canceled2) resolveCancelPromise(void 0);
					},
					_errorSteps: () => {
						reading = false;
					}
				});
			}
			function pullWithBYOBReader(view, forBranch2) {
				if (IsReadableStreamDefaultReader(reader)) {
					ReadableStreamReaderGenericRelease(reader);
					reader = AcquireReadableStreamBYOBReader(stream);
					forwardReaderError(reader);
				}
				const byobBranch = forBranch2 ? branch2 : branch1;
				const otherBranch = forBranch2 ? branch1 : branch2;
				ReadableStreamBYOBReaderRead(reader, view, 1, {
					_chunkSteps: (chunk) => {
						_queueMicrotask(() => {
							readAgainForBranch1 = false;
							readAgainForBranch2 = false;
							const byobCanceled = forBranch2 ? canceled2 : canceled1;
							if (!(forBranch2 ? canceled1 : canceled2)) {
								let clonedChunk;
								try {
									clonedChunk = CloneAsUint8Array(chunk);
								} catch (cloneE) {
									ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
									ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
									resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
									return;
								}
								if (!byobCanceled) ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
								ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
							} else if (!byobCanceled) ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
							reading = false;
							if (readAgainForBranch1) pull1Algorithm();
							else if (readAgainForBranch2) pull2Algorithm();
						});
					},
					_closeSteps: (chunk) => {
						reading = false;
						const byobCanceled = forBranch2 ? canceled2 : canceled1;
						const otherCanceled = forBranch2 ? canceled1 : canceled2;
						if (!byobCanceled) ReadableByteStreamControllerClose(byobBranch._readableStreamController);
						if (!otherCanceled) ReadableByteStreamControllerClose(otherBranch._readableStreamController);
						if (chunk !== void 0) {
							if (!byobCanceled) ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
							if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
						}
						if (!byobCanceled || !otherCanceled) resolveCancelPromise(void 0);
					},
					_errorSteps: () => {
						reading = false;
					}
				});
			}
			function pull1Algorithm() {
				if (reading) {
					readAgainForBranch1 = true;
					return promiseResolvedWith(void 0);
				}
				reading = true;
				const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
				if (byobRequest === null) pullWithDefaultReader();
				else pullWithBYOBReader(byobRequest._view, false);
				return promiseResolvedWith(void 0);
			}
			function pull2Algorithm() {
				if (reading) {
					readAgainForBranch2 = true;
					return promiseResolvedWith(void 0);
				}
				reading = true;
				const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
				if (byobRequest === null) pullWithDefaultReader();
				else pullWithBYOBReader(byobRequest._view, true);
				return promiseResolvedWith(void 0);
			}
			function cancel1Algorithm(reason) {
				canceled1 = true;
				reason1 = reason;
				if (canceled2) {
					const cancelResult = ReadableStreamCancel(stream, CreateArrayFromList([reason1, reason2]));
					resolveCancelPromise(cancelResult);
				}
				return cancelPromise;
			}
			function cancel2Algorithm(reason) {
				canceled2 = true;
				reason2 = reason;
				if (canceled1) {
					const cancelResult = ReadableStreamCancel(stream, CreateArrayFromList([reason1, reason2]));
					resolveCancelPromise(cancelResult);
				}
				return cancelPromise;
			}
			function startAlgorithm() {}
			branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
			branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
			forwardReaderError(reader);
			return [branch1, branch2];
		}
		function isReadableStreamLike(stream) {
			return typeIsObject(stream) && typeof stream.getReader !== "undefined";
		}
		function ReadableStreamFrom(source) {
			if (isReadableStreamLike(source)) return ReadableStreamFromDefaultReader(source.getReader());
			return ReadableStreamFromIterable(source);
		}
		function ReadableStreamFromIterable(asyncIterable) {
			let stream;
			const iteratorRecord = GetIterator(asyncIterable, "async");
			const startAlgorithm = noop;
			function pullAlgorithm() {
				let nextResult;
				try {
					nextResult = IteratorNext(iteratorRecord);
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				return transformPromiseWith(promiseResolvedWith(nextResult), (iterResult) => {
					if (!typeIsObject(iterResult)) throw new TypeError("The promise returned by the iterator.next() method must fulfill with an object");
					if (IteratorComplete(iterResult)) ReadableStreamDefaultControllerClose(stream._readableStreamController);
					else {
						const value = IteratorValue(iterResult);
						ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
					}
				});
			}
			function cancelAlgorithm(reason) {
				const iterator = iteratorRecord.iterator;
				let returnMethod;
				try {
					returnMethod = GetMethod(iterator, "return");
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				if (returnMethod === void 0) return promiseResolvedWith(void 0);
				let returnResult;
				try {
					returnResult = reflectCall(returnMethod, iterator, [reason]);
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				return transformPromiseWith(promiseResolvedWith(returnResult), (iterResult) => {
					if (!typeIsObject(iterResult)) throw new TypeError("The promise returned by the iterator.return() method must fulfill with an object");
				});
			}
			stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
			return stream;
		}
		function ReadableStreamFromDefaultReader(reader) {
			let stream;
			const startAlgorithm = noop;
			function pullAlgorithm() {
				let readPromise;
				try {
					readPromise = reader.read();
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				return transformPromiseWith(readPromise, (readResult) => {
					if (!typeIsObject(readResult)) throw new TypeError("The promise returned by the reader.read() method must fulfill with an object");
					if (readResult.done) ReadableStreamDefaultControllerClose(stream._readableStreamController);
					else {
						const value = readResult.value;
						ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
					}
				});
			}
			function cancelAlgorithm(reason) {
				try {
					return promiseResolvedWith(reader.cancel(reason));
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
			}
			stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
			return stream;
		}
		function convertUnderlyingDefaultOrByteSource(source, context) {
			assertDictionary(source, context);
			const original = source;
			const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
			const cancel = original === null || original === void 0 ? void 0 : original.cancel;
			const pull = original === null || original === void 0 ? void 0 : original.pull;
			const start = original === null || original === void 0 ? void 0 : original.start;
			const type = original === null || original === void 0 ? void 0 : original.type;
			return {
				autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
				cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
				pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
				start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
				type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
			};
		}
		function convertUnderlyingSourceCancelCallback(fn, original, context) {
			assertFunction(fn, context);
			return (reason) => promiseCall(fn, original, [reason]);
		}
		function convertUnderlyingSourcePullCallback(fn, original, context) {
			assertFunction(fn, context);
			return (controller) => promiseCall(fn, original, [controller]);
		}
		function convertUnderlyingSourceStartCallback(fn, original, context) {
			assertFunction(fn, context);
			return (controller) => reflectCall(fn, original, [controller]);
		}
		function convertReadableStreamType(type, context) {
			type = `${type}`;
			if (type !== "bytes") throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
			return type;
		}
		function convertIteratorOptions(options, context) {
			assertDictionary(options, context);
			const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
			return { preventCancel: Boolean(preventCancel) };
		}
		function convertPipeOptions(options, context) {
			assertDictionary(options, context);
			const preventAbort = options === null || options === void 0 ? void 0 : options.preventAbort;
			const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
			const preventClose = options === null || options === void 0 ? void 0 : options.preventClose;
			const signal = options === null || options === void 0 ? void 0 : options.signal;
			if (signal !== void 0) assertAbortSignal(signal, `${context} has member 'signal' that`);
			return {
				preventAbort: Boolean(preventAbort),
				preventCancel: Boolean(preventCancel),
				preventClose: Boolean(preventClose),
				signal
			};
		}
		function assertAbortSignal(signal, context) {
			if (!isAbortSignal$1(signal)) throw new TypeError(`${context} is not an AbortSignal.`);
		}
		function convertReadableWritablePair(pair, context) {
			assertDictionary(pair, context);
			const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
			assertRequiredField(readable, "readable", "ReadableWritablePair");
			assertReadableStream(readable, `${context} has member 'readable' that`);
			const writable = pair === null || pair === void 0 ? void 0 : pair.writable;
			assertRequiredField(writable, "writable", "ReadableWritablePair");
			assertWritableStream(writable, `${context} has member 'writable' that`);
			return {
				readable,
				writable
			};
		}
		/**
		* A readable stream represents a source of data, from which you can read.
		*
		* @public
		*/
		class ReadableStream$1 {
			constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
				if (rawUnderlyingSource === void 0) rawUnderlyingSource = null;
				else assertObject(rawUnderlyingSource, "First parameter");
				const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
				const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
				InitializeReadableStream(this);
				if (underlyingSource.type === "bytes") {
					if (strategy.size !== void 0) throw new RangeError("The strategy for a byte stream cannot have a size function");
					const highWaterMark = ExtractHighWaterMark(strategy, 0);
					SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
				} else {
					const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
					const highWaterMark = ExtractHighWaterMark(strategy, 1);
					SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
				}
			}
			/**
			* Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
			*/
			get locked() {
				if (!IsReadableStream(this)) throw streamBrandCheckException$1("locked");
				return IsReadableStreamLocked(this);
			}
			/**
			* Cancels the stream, signaling a loss of interest in the stream by a consumer.
			*
			* The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
			* method, which might or might not use it.
			*/
			cancel(reason = void 0) {
				if (!IsReadableStream(this)) return promiseRejectedWith(streamBrandCheckException$1("cancel"));
				if (IsReadableStreamLocked(this)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("Cannot cancel a stream that already has a reader"));
				return ReadableStreamCancel(this, reason);
			}
			getReader(rawOptions = void 0) {
				if (!IsReadableStream(this)) throw streamBrandCheckException$1("getReader");
				if (convertReaderOptions(rawOptions, "First parameter").mode === void 0) return AcquireReadableStreamDefaultReader(this);
				return AcquireReadableStreamBYOBReader(this);
			}
			pipeThrough(rawTransform, rawOptions = {}) {
				if (!IsReadableStream(this)) throw streamBrandCheckException$1("pipeThrough");
				assertRequiredArgument(rawTransform, 1, "pipeThrough");
				const transform = convertReadableWritablePair(rawTransform, "First parameter");
				const options = convertPipeOptions(rawOptions, "Second parameter");
				if (IsReadableStreamLocked(this)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
				if (IsWritableStreamLocked(transform.writable)) throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
				setPromiseIsHandledToTrue(ReadableStreamPipeTo(this, transform.writable, options.preventClose, options.preventAbort, options.preventCancel, options.signal));
				return transform.readable;
			}
			pipeTo(destination, rawOptions = {}) {
				if (!IsReadableStream(this)) return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
				if (destination === void 0) return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
				if (!IsWritableStream(destination)) return promiseRejectedWith(/* @__PURE__ */ new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
				let options;
				try {
					options = convertPipeOptions(rawOptions, "Second parameter");
				} catch (e$1) {
					return promiseRejectedWith(e$1);
				}
				if (IsReadableStreamLocked(this)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
				if (IsWritableStreamLocked(destination)) return promiseRejectedWith(/* @__PURE__ */ new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
				return ReadableStreamPipeTo(this, destination, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
			}
			/**
			* Tees this readable stream, returning a two-element array containing the two resulting branches as
			* new {@link ReadableStream} instances.
			*
			* Teeing a stream will lock it, preventing any other consumer from acquiring a reader.
			* To cancel the stream, cancel both of the resulting branches; a composite cancellation reason will then be
			* propagated to the stream's underlying source.
			*
			* Note that the chunks seen in each branch will be the same object. If the chunks are not immutable,
			* this could allow interference between the two branches.
			*/
			tee() {
				if (!IsReadableStream(this)) throw streamBrandCheckException$1("tee");
				return CreateArrayFromList(ReadableStreamTee(this));
			}
			values(rawOptions = void 0) {
				if (!IsReadableStream(this)) throw streamBrandCheckException$1("values");
				const options = convertIteratorOptions(rawOptions, "First parameter");
				return AcquireReadableStreamAsyncIterator(this, options.preventCancel);
			}
			[SymbolAsyncIterator](options) {
				return this.values(options);
			}
			/**
			* Creates a new ReadableStream wrapping the provided iterable or async iterable.
			*
			* This can be used to adapt various kinds of objects into a readable stream,
			* such as an array, an async generator, or a Node.js readable stream.
			*/
			static from(asyncIterable) {
				return ReadableStreamFrom(asyncIterable);
			}
		}
		Object.defineProperties(ReadableStream$1, { from: { enumerable: true } });
		Object.defineProperties(ReadableStream$1.prototype, {
			cancel: { enumerable: true },
			getReader: { enumerable: true },
			pipeThrough: { enumerable: true },
			pipeTo: { enumerable: true },
			tee: { enumerable: true },
			values: { enumerable: true },
			locked: { enumerable: true }
		});
		setFunctionName(ReadableStream$1.from, "from");
		setFunctionName(ReadableStream$1.prototype.cancel, "cancel");
		setFunctionName(ReadableStream$1.prototype.getReader, "getReader");
		setFunctionName(ReadableStream$1.prototype.pipeThrough, "pipeThrough");
		setFunctionName(ReadableStream$1.prototype.pipeTo, "pipeTo");
		setFunctionName(ReadableStream$1.prototype.tee, "tee");
		setFunctionName(ReadableStream$1.prototype.values, "values");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ReadableStream$1.prototype, Symbol.toStringTag, {
			value: "ReadableStream",
			configurable: true
		});
		Object.defineProperty(ReadableStream$1.prototype, SymbolAsyncIterator, {
			value: ReadableStream$1.prototype.values,
			writable: true,
			configurable: true
		});
		function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
			const stream = Object.create(ReadableStream$1.prototype);
			InitializeReadableStream(stream);
			SetUpReadableStreamDefaultController(stream, Object.create(ReadableStreamDefaultController.prototype), startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
			return stream;
		}
		function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
			const stream = Object.create(ReadableStream$1.prototype);
			InitializeReadableStream(stream);
			SetUpReadableByteStreamController(stream, Object.create(ReadableByteStreamController.prototype), startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
			return stream;
		}
		function InitializeReadableStream(stream) {
			stream._state = "readable";
			stream._reader = void 0;
			stream._storedError = void 0;
			stream._disturbed = false;
		}
		function IsReadableStream(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_readableStreamController")) return false;
			return x$1 instanceof ReadableStream$1;
		}
		function IsReadableStreamLocked(stream) {
			if (stream._reader === void 0) return false;
			return true;
		}
		function ReadableStreamCancel(stream, reason) {
			stream._disturbed = true;
			if (stream._state === "closed") return promiseResolvedWith(void 0);
			if (stream._state === "errored") return promiseRejectedWith(stream._storedError);
			ReadableStreamClose(stream);
			const reader = stream._reader;
			if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
				const readIntoRequests = reader._readIntoRequests;
				reader._readIntoRequests = new SimpleQueue();
				readIntoRequests.forEach((readIntoRequest) => {
					readIntoRequest._closeSteps(void 0);
				});
			}
			return transformPromiseWith(stream._readableStreamController[CancelSteps](reason), noop);
		}
		function ReadableStreamClose(stream) {
			stream._state = "closed";
			const reader = stream._reader;
			if (reader === void 0) return;
			defaultReaderClosedPromiseResolve(reader);
			if (IsReadableStreamDefaultReader(reader)) {
				const readRequests = reader._readRequests;
				reader._readRequests = new SimpleQueue();
				readRequests.forEach((readRequest) => {
					readRequest._closeSteps();
				});
			}
		}
		function ReadableStreamError(stream, e$1) {
			stream._state = "errored";
			stream._storedError = e$1;
			const reader = stream._reader;
			if (reader === void 0) return;
			defaultReaderClosedPromiseReject(reader, e$1);
			if (IsReadableStreamDefaultReader(reader)) ReadableStreamDefaultReaderErrorReadRequests(reader, e$1);
			else ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e$1);
		}
		function streamBrandCheckException$1(name) {
			return /* @__PURE__ */ new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
		}
		function convertQueuingStrategyInit(init, context) {
			assertDictionary(init, context);
			const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
			assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
			return { highWaterMark: convertUnrestrictedDouble(highWaterMark) };
		}
		const byteLengthSizeFunction = (chunk) => {
			return chunk.byteLength;
		};
		setFunctionName(byteLengthSizeFunction, "size");
		/**
		* A queuing strategy that counts the number of bytes in each chunk.
		*
		* @public
		*/
		class ByteLengthQueuingStrategy {
			constructor(options) {
				assertRequiredArgument(options, 1, "ByteLengthQueuingStrategy");
				options = convertQueuingStrategyInit(options, "First parameter");
				this._byteLengthQueuingStrategyHighWaterMark = options.highWaterMark;
			}
			/**
			* Returns the high water mark provided to the constructor.
			*/
			get highWaterMark() {
				if (!IsByteLengthQueuingStrategy(this)) throw byteLengthBrandCheckException("highWaterMark");
				return this._byteLengthQueuingStrategyHighWaterMark;
			}
			/**
			* Measures the size of `chunk` by returning the value of its `byteLength` property.
			*/
			get size() {
				if (!IsByteLengthQueuingStrategy(this)) throw byteLengthBrandCheckException("size");
				return byteLengthSizeFunction;
			}
		}
		Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
			highWaterMark: { enumerable: true },
			size: { enumerable: true }
		});
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(ByteLengthQueuingStrategy.prototype, Symbol.toStringTag, {
			value: "ByteLengthQueuingStrategy",
			configurable: true
		});
		function byteLengthBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
		}
		function IsByteLengthQueuingStrategy(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_byteLengthQueuingStrategyHighWaterMark")) return false;
			return x$1 instanceof ByteLengthQueuingStrategy;
		}
		const countSizeFunction = () => {
			return 1;
		};
		setFunctionName(countSizeFunction, "size");
		/**
		* A queuing strategy that counts the number of chunks.
		*
		* @public
		*/
		class CountQueuingStrategy {
			constructor(options) {
				assertRequiredArgument(options, 1, "CountQueuingStrategy");
				options = convertQueuingStrategyInit(options, "First parameter");
				this._countQueuingStrategyHighWaterMark = options.highWaterMark;
			}
			/**
			* Returns the high water mark provided to the constructor.
			*/
			get highWaterMark() {
				if (!IsCountQueuingStrategy(this)) throw countBrandCheckException("highWaterMark");
				return this._countQueuingStrategyHighWaterMark;
			}
			/**
			* Measures the size of `chunk` by always returning 1.
			* This ensures that the total queue size is a count of the number of chunks in the queue.
			*/
			get size() {
				if (!IsCountQueuingStrategy(this)) throw countBrandCheckException("size");
				return countSizeFunction;
			}
		}
		Object.defineProperties(CountQueuingStrategy.prototype, {
			highWaterMark: { enumerable: true },
			size: { enumerable: true }
		});
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(CountQueuingStrategy.prototype, Symbol.toStringTag, {
			value: "CountQueuingStrategy",
			configurable: true
		});
		function countBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
		}
		function IsCountQueuingStrategy(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_countQueuingStrategyHighWaterMark")) return false;
			return x$1 instanceof CountQueuingStrategy;
		}
		function convertTransformer(original, context) {
			assertDictionary(original, context);
			const cancel = original === null || original === void 0 ? void 0 : original.cancel;
			const flush = original === null || original === void 0 ? void 0 : original.flush;
			const readableType = original === null || original === void 0 ? void 0 : original.readableType;
			const start = original === null || original === void 0 ? void 0 : original.start;
			const transform = original === null || original === void 0 ? void 0 : original.transform;
			const writableType = original === null || original === void 0 ? void 0 : original.writableType;
			return {
				cancel: cancel === void 0 ? void 0 : convertTransformerCancelCallback(cancel, original, `${context} has member 'cancel' that`),
				flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
				readableType,
				start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
				transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
				writableType
			};
		}
		function convertTransformerFlushCallback(fn, original, context) {
			assertFunction(fn, context);
			return (controller) => promiseCall(fn, original, [controller]);
		}
		function convertTransformerStartCallback(fn, original, context) {
			assertFunction(fn, context);
			return (controller) => reflectCall(fn, original, [controller]);
		}
		function convertTransformerTransformCallback(fn, original, context) {
			assertFunction(fn, context);
			return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
		}
		function convertTransformerCancelCallback(fn, original, context) {
			assertFunction(fn, context);
			return (reason) => promiseCall(fn, original, [reason]);
		}
		/**
		* A transform stream consists of a pair of streams: a {@link WritableStream | writable stream},
		* known as its writable side, and a {@link ReadableStream | readable stream}, known as its readable side.
		* In a manner specific to the transform stream in question, writes to the writable side result in new data being
		* made available for reading from the readable side.
		*
		* @public
		*/
		class TransformStream {
			constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
				if (rawTransformer === void 0) rawTransformer = null;
				const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
				const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
				const transformer = convertTransformer(rawTransformer, "First parameter");
				if (transformer.readableType !== void 0) throw new RangeError("Invalid readableType specified");
				if (transformer.writableType !== void 0) throw new RangeError("Invalid writableType specified");
				const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
				const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
				const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
				const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
				let startPromise_resolve;
				const startPromise = newPromise((resolve) => {
					startPromise_resolve = resolve;
				});
				InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
				SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
				if (transformer.start !== void 0) startPromise_resolve(transformer.start(this._transformStreamController));
				else startPromise_resolve(void 0);
			}
			/**
			* The readable side of the transform stream.
			*/
			get readable() {
				if (!IsTransformStream(this)) throw streamBrandCheckException("readable");
				return this._readable;
			}
			/**
			* The writable side of the transform stream.
			*/
			get writable() {
				if (!IsTransformStream(this)) throw streamBrandCheckException("writable");
				return this._writable;
			}
		}
		Object.defineProperties(TransformStream.prototype, {
			readable: { enumerable: true },
			writable: { enumerable: true }
		});
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(TransformStream.prototype, Symbol.toStringTag, {
			value: "TransformStream",
			configurable: true
		});
		function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
			function startAlgorithm() {
				return startPromise;
			}
			function writeAlgorithm(chunk) {
				return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
			}
			function abortAlgorithm(reason) {
				return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
			}
			function closeAlgorithm() {
				return TransformStreamDefaultSinkCloseAlgorithm(stream);
			}
			stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
			function pullAlgorithm() {
				return TransformStreamDefaultSourcePullAlgorithm(stream);
			}
			function cancelAlgorithm(reason) {
				return TransformStreamDefaultSourceCancelAlgorithm(stream, reason);
			}
			stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
			stream._backpressure = void 0;
			stream._backpressureChangePromise = void 0;
			stream._backpressureChangePromise_resolve = void 0;
			TransformStreamSetBackpressure(stream, true);
			stream._transformStreamController = void 0;
		}
		function IsTransformStream(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_transformStreamController")) return false;
			return x$1 instanceof TransformStream;
		}
		function TransformStreamError(stream, e$1) {
			ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e$1);
			TransformStreamErrorWritableAndUnblockWrite(stream, e$1);
		}
		function TransformStreamErrorWritableAndUnblockWrite(stream, e$1) {
			TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
			WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e$1);
			TransformStreamUnblockWrite(stream);
		}
		function TransformStreamUnblockWrite(stream) {
			if (stream._backpressure) TransformStreamSetBackpressure(stream, false);
		}
		function TransformStreamSetBackpressure(stream, backpressure) {
			if (stream._backpressureChangePromise !== void 0) stream._backpressureChangePromise_resolve();
			stream._backpressureChangePromise = newPromise((resolve) => {
				stream._backpressureChangePromise_resolve = resolve;
			});
			stream._backpressure = backpressure;
		}
		/**
		* Allows control of the {@link ReadableStream} and {@link WritableStream} of the associated {@link TransformStream}.
		*
		* @public
		*/
		class TransformStreamDefaultController {
			constructor() {
				throw new TypeError("Illegal constructor");
			}
			/**
			* Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
			*/
			get desiredSize() {
				if (!IsTransformStreamDefaultController(this)) throw defaultControllerBrandCheckException("desiredSize");
				const readableController = this._controlledTransformStream._readable._readableStreamController;
				return ReadableStreamDefaultControllerGetDesiredSize(readableController);
			}
			enqueue(chunk = void 0) {
				if (!IsTransformStreamDefaultController(this)) throw defaultControllerBrandCheckException("enqueue");
				TransformStreamDefaultControllerEnqueue(this, chunk);
			}
			/**
			* Errors both the readable side and the writable side of the controlled transform stream, making all future
			* interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
			*/
			error(reason = void 0) {
				if (!IsTransformStreamDefaultController(this)) throw defaultControllerBrandCheckException("error");
				TransformStreamDefaultControllerError(this, reason);
			}
			/**
			* Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
			* transformer only needs to consume a portion of the chunks written to the writable side.
			*/
			terminate() {
				if (!IsTransformStreamDefaultController(this)) throw defaultControllerBrandCheckException("terminate");
				TransformStreamDefaultControllerTerminate(this);
			}
		}
		Object.defineProperties(TransformStreamDefaultController.prototype, {
			enqueue: { enumerable: true },
			error: { enumerable: true },
			terminate: { enumerable: true },
			desiredSize: { enumerable: true }
		});
		setFunctionName(TransformStreamDefaultController.prototype.enqueue, "enqueue");
		setFunctionName(TransformStreamDefaultController.prototype.error, "error");
		setFunctionName(TransformStreamDefaultController.prototype.terminate, "terminate");
		if (typeof Symbol.toStringTag === "symbol") Object.defineProperty(TransformStreamDefaultController.prototype, Symbol.toStringTag, {
			value: "TransformStreamDefaultController",
			configurable: true
		});
		function IsTransformStreamDefaultController(x$1) {
			if (!typeIsObject(x$1)) return false;
			if (!Object.prototype.hasOwnProperty.call(x$1, "_controlledTransformStream")) return false;
			return x$1 instanceof TransformStreamDefaultController;
		}
		function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm) {
			controller._controlledTransformStream = stream;
			stream._transformStreamController = controller;
			controller._transformAlgorithm = transformAlgorithm;
			controller._flushAlgorithm = flushAlgorithm;
			controller._cancelAlgorithm = cancelAlgorithm;
			controller._finishPromise = void 0;
			controller._finishPromise_resolve = void 0;
			controller._finishPromise_reject = void 0;
		}
		function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
			const controller = Object.create(TransformStreamDefaultController.prototype);
			let transformAlgorithm;
			let flushAlgorithm;
			let cancelAlgorithm;
			if (transformer.transform !== void 0) transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
			else transformAlgorithm = (chunk) => {
				try {
					TransformStreamDefaultControllerEnqueue(controller, chunk);
					return promiseResolvedWith(void 0);
				} catch (transformResultE) {
					return promiseRejectedWith(transformResultE);
				}
			};
			if (transformer.flush !== void 0) flushAlgorithm = () => transformer.flush(controller);
			else flushAlgorithm = () => promiseResolvedWith(void 0);
			if (transformer.cancel !== void 0) cancelAlgorithm = (reason) => transformer.cancel(reason);
			else cancelAlgorithm = () => promiseResolvedWith(void 0);
			SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm);
		}
		function TransformStreamDefaultControllerClearAlgorithms(controller) {
			controller._transformAlgorithm = void 0;
			controller._flushAlgorithm = void 0;
			controller._cancelAlgorithm = void 0;
		}
		function TransformStreamDefaultControllerEnqueue(controller, chunk) {
			const stream = controller._controlledTransformStream;
			const readableController = stream._readable._readableStreamController;
			if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) throw new TypeError("Readable side is not in a state that permits enqueue");
			try {
				ReadableStreamDefaultControllerEnqueue(readableController, chunk);
			} catch (e$1) {
				TransformStreamErrorWritableAndUnblockWrite(stream, e$1);
				throw stream._readable._storedError;
			}
			if (ReadableStreamDefaultControllerHasBackpressure(readableController) !== stream._backpressure) TransformStreamSetBackpressure(stream, true);
		}
		function TransformStreamDefaultControllerError(controller, e$1) {
			TransformStreamError(controller._controlledTransformStream, e$1);
		}
		function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
			return transformPromiseWith(controller._transformAlgorithm(chunk), void 0, (r$1) => {
				TransformStreamError(controller._controlledTransformStream, r$1);
				throw r$1;
			});
		}
		function TransformStreamDefaultControllerTerminate(controller) {
			const stream = controller._controlledTransformStream;
			const readableController = stream._readable._readableStreamController;
			ReadableStreamDefaultControllerClose(readableController);
			TransformStreamErrorWritableAndUnblockWrite(stream, /* @__PURE__ */ new TypeError("TransformStream terminated"));
		}
		function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
			const controller = stream._transformStreamController;
			if (stream._backpressure) {
				const backpressureChangePromise = stream._backpressureChangePromise;
				return transformPromiseWith(backpressureChangePromise, () => {
					const writable = stream._writable;
					if (writable._state === "erroring") throw writable._storedError;
					return TransformStreamDefaultControllerPerformTransform(controller, chunk);
				});
			}
			return TransformStreamDefaultControllerPerformTransform(controller, chunk);
		}
		function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
			const controller = stream._transformStreamController;
			if (controller._finishPromise !== void 0) return controller._finishPromise;
			const readable = stream._readable;
			controller._finishPromise = newPromise((resolve, reject) => {
				controller._finishPromise_resolve = resolve;
				controller._finishPromise_reject = reject;
			});
			const cancelPromise = controller._cancelAlgorithm(reason);
			TransformStreamDefaultControllerClearAlgorithms(controller);
			uponPromise(cancelPromise, () => {
				if (readable._state === "errored") defaultControllerFinishPromiseReject(controller, readable._storedError);
				else {
					ReadableStreamDefaultControllerError(readable._readableStreamController, reason);
					defaultControllerFinishPromiseResolve(controller);
				}
				return null;
			}, (r$1) => {
				ReadableStreamDefaultControllerError(readable._readableStreamController, r$1);
				defaultControllerFinishPromiseReject(controller, r$1);
				return null;
			});
			return controller._finishPromise;
		}
		function TransformStreamDefaultSinkCloseAlgorithm(stream) {
			const controller = stream._transformStreamController;
			if (controller._finishPromise !== void 0) return controller._finishPromise;
			const readable = stream._readable;
			controller._finishPromise = newPromise((resolve, reject) => {
				controller._finishPromise_resolve = resolve;
				controller._finishPromise_reject = reject;
			});
			const flushPromise = controller._flushAlgorithm();
			TransformStreamDefaultControllerClearAlgorithms(controller);
			uponPromise(flushPromise, () => {
				if (readable._state === "errored") defaultControllerFinishPromiseReject(controller, readable._storedError);
				else {
					ReadableStreamDefaultControllerClose(readable._readableStreamController);
					defaultControllerFinishPromiseResolve(controller);
				}
				return null;
			}, (r$1) => {
				ReadableStreamDefaultControllerError(readable._readableStreamController, r$1);
				defaultControllerFinishPromiseReject(controller, r$1);
				return null;
			});
			return controller._finishPromise;
		}
		function TransformStreamDefaultSourcePullAlgorithm(stream) {
			TransformStreamSetBackpressure(stream, false);
			return stream._backpressureChangePromise;
		}
		function TransformStreamDefaultSourceCancelAlgorithm(stream, reason) {
			const controller = stream._transformStreamController;
			if (controller._finishPromise !== void 0) return controller._finishPromise;
			const writable = stream._writable;
			controller._finishPromise = newPromise((resolve, reject) => {
				controller._finishPromise_resolve = resolve;
				controller._finishPromise_reject = reject;
			});
			const cancelPromise = controller._cancelAlgorithm(reason);
			TransformStreamDefaultControllerClearAlgorithms(controller);
			uponPromise(cancelPromise, () => {
				if (writable._state === "errored") defaultControllerFinishPromiseReject(controller, writable._storedError);
				else {
					WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, reason);
					TransformStreamUnblockWrite(stream);
					defaultControllerFinishPromiseResolve(controller);
				}
				return null;
			}, (r$1) => {
				WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, r$1);
				TransformStreamUnblockWrite(stream);
				defaultControllerFinishPromiseReject(controller, r$1);
				return null;
			});
			return controller._finishPromise;
		}
		function defaultControllerBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
		}
		function defaultControllerFinishPromiseResolve(controller) {
			if (controller._finishPromise_resolve === void 0) return;
			controller._finishPromise_resolve();
			controller._finishPromise_resolve = void 0;
			controller._finishPromise_reject = void 0;
		}
		function defaultControllerFinishPromiseReject(controller, reason) {
			if (controller._finishPromise_reject === void 0) return;
			setPromiseIsHandledToTrue(controller._finishPromise);
			controller._finishPromise_reject(reason);
			controller._finishPromise_resolve = void 0;
			controller._finishPromise_reject = void 0;
		}
		function streamBrandCheckException(name) {
			return /* @__PURE__ */ new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
		}
		exports$1.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
		exports$1.CountQueuingStrategy = CountQueuingStrategy;
		exports$1.ReadableByteStreamController = ReadableByteStreamController;
		exports$1.ReadableStream = ReadableStream$1;
		exports$1.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
		exports$1.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
		exports$1.ReadableStreamDefaultController = ReadableStreamDefaultController;
		exports$1.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
		exports$1.TransformStream = TransformStream;
		exports$1.TransformStreamDefaultController = TransformStreamDefaultController;
		exports$1.WritableStream = WritableStream;
		exports$1.WritableStreamDefaultController = WritableStreamDefaultController;
		exports$1.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
	}));
}));

//#endregion
//#region node_modules/fetch-blob/streams.cjs
var require_streams = /* @__PURE__ */ __commonJSMin((() => {
	/* c8 ignore start */
	const POOL_SIZE = 65536;
	if (!globalThis.ReadableStream) try {
		const process$1 = __require("node:process");
		const { emitWarning } = process$1;
		try {
			process$1.emitWarning = () => {};
			Object.assign(globalThis, __require("node:stream/web"));
			process$1.emitWarning = emitWarning;
		} catch (error) {
			process$1.emitWarning = emitWarning;
			throw error;
		}
	} catch (error) {
		Object.assign(globalThis, require_ponyfill_es2018());
	}
	try {
		const { Blob: Blob$1 } = __require("buffer");
		if (Blob$1 && !Blob$1.prototype.stream) Blob$1.prototype.stream = function name(params) {
			let position = 0;
			const blob = this;
			return new ReadableStream({
				type: "bytes",
				async pull(ctrl) {
					const buffer = await blob.slice(position, Math.min(blob.size, position + POOL_SIZE)).arrayBuffer();
					position += buffer.byteLength;
					ctrl.enqueue(new Uint8Array(buffer));
					if (position === blob.size) ctrl.close();
				}
			});
		};
	} catch (error) {}
}));
/* c8 ignore end */

//#endregion
//#region node_modules/fetch-blob/index.js
var import_streams = require_streams();
const POOL_SIZE = 65536;
/** @param {(Blob | Uint8Array)[]} parts */
async function* toIterator(parts, clone$1 = true) {
	for (const part of parts) if ("stream" in part) yield* part.stream();
	else if (ArrayBuffer.isView(part)) if (clone$1) {
		let position = part.byteOffset;
		const end = part.byteOffset + part.byteLength;
		while (position !== end) {
			const size = Math.min(end - position, POOL_SIZE);
			const chunk = part.buffer.slice(position, position + size);
			position += chunk.byteLength;
			yield new Uint8Array(chunk);
		}
	} else yield part;
	else {
		let position = 0, b = part;
		while (position !== b.size) {
			const buffer = await b.slice(position, Math.min(b.size, position + POOL_SIZE)).arrayBuffer();
			position += buffer.byteLength;
			yield new Uint8Array(buffer);
		}
	}
}
const _Blob = class Blob$1 {
	/** @type {Array.<(Blob|Uint8Array)>} */
	#parts = [];
	#type = "";
	#size = 0;
	#endings = "transparent";
	/**
	* The Blob() constructor returns a new Blob object. The content
	* of the blob consists of the concatenation of the values given
	* in the parameter array.
	*
	* @param {*} blobParts
	* @param {{ type?: string, endings?: string }} [options]
	*/
	constructor(blobParts = [], options = {}) {
		if (typeof blobParts !== "object" || blobParts === null) throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
		if (typeof blobParts[Symbol.iterator] !== "function") throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
		if (typeof options !== "object" && typeof options !== "function") throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
		if (options === null) options = {};
		const encoder = new TextEncoder();
		for (const element of blobParts) {
			let part;
			if (ArrayBuffer.isView(element)) part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
			else if (element instanceof ArrayBuffer) part = new Uint8Array(element.slice(0));
			else if (element instanceof Blob$1) part = element;
			else part = encoder.encode(`${element}`);
			this.#size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
			this.#parts.push(part);
		}
		this.#endings = `${options.endings === void 0 ? "transparent" : options.endings}`;
		const type = options.type === void 0 ? "" : String(options.type);
		this.#type = /^[\x20-\x7E]*$/.test(type) ? type : "";
	}
	/**
	* The Blob interface's size property returns the
	* size of the Blob in bytes.
	*/
	get size() {
		return this.#size;
	}
	/**
	* The type property of a Blob object returns the MIME type of the file.
	*/
	get type() {
		return this.#type;
	}
	/**
	* The text() method in the Blob interface returns a Promise
	* that resolves with a string containing the contents of
	* the blob, interpreted as UTF-8.
	*
	* @return {Promise<string>}
	*/
	async text() {
		const decoder = new TextDecoder();
		let str = "";
		for await (const part of toIterator(this.#parts, false)) str += decoder.decode(part, { stream: true });
		str += decoder.decode();
		return str;
	}
	/**
	* The arrayBuffer() method in the Blob interface returns a
	* Promise that resolves with the contents of the blob as
	* binary data contained in an ArrayBuffer.
	*
	* @return {Promise<ArrayBuffer>}
	*/
	async arrayBuffer() {
		const data = new Uint8Array(this.size);
		let offset = 0;
		for await (const chunk of toIterator(this.#parts, false)) {
			data.set(chunk, offset);
			offset += chunk.length;
		}
		return data.buffer;
	}
	stream() {
		const it = toIterator(this.#parts, true);
		return new globalThis.ReadableStream({
			type: "bytes",
			async pull(ctrl) {
				const chunk = await it.next();
				chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
			},
			async cancel() {
				await it.return();
			}
		});
	}
	/**
	* The Blob interface's slice() method creates and returns a
	* new Blob object which contains data from a subset of the
	* blob on which it's called.
	*
	* @param {number} [start]
	* @param {number} [end]
	* @param {string} [type]
	*/
	slice(start = 0, end = this.size, type = "") {
		const { size } = this;
		let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
		let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
		const span = Math.max(relativeEnd - relativeStart, 0);
		const parts = this.#parts;
		const blobParts = [];
		let added = 0;
		for (const part of parts) {
			if (added >= span) break;
			const size$1 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
			if (relativeStart && size$1 <= relativeStart) {
				relativeStart -= size$1;
				relativeEnd -= size$1;
			} else {
				let chunk;
				if (ArrayBuffer.isView(part)) {
					chunk = part.subarray(relativeStart, Math.min(size$1, relativeEnd));
					added += chunk.byteLength;
				} else {
					chunk = part.slice(relativeStart, Math.min(size$1, relativeEnd));
					added += chunk.size;
				}
				relativeEnd -= size$1;
				blobParts.push(chunk);
				relativeStart = 0;
			}
		}
		const blob = new Blob$1([], { type: String(type).toLowerCase() });
		blob.#size = span;
		blob.#parts = blobParts;
		return blob;
	}
	get [Symbol.toStringTag]() {
		return "Blob";
	}
	static [Symbol.hasInstance](object) {
		return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
	}
};
Object.defineProperties(_Blob.prototype, {
	size: { enumerable: true },
	type: { enumerable: true },
	slice: { enumerable: true }
});
/** @type {typeof globalThis.Blob} */
const Blob = _Blob;
var fetch_blob_default = Blob;

//#endregion
//#region node_modules/fetch-blob/file.js
const _File = class File$1 extends fetch_blob_default {
	#lastModified = 0;
	#name = "";
	/**
	* @param {*[]} fileBits
	* @param {string} fileName
	* @param {{lastModified?: number, type?: string}} options
	*/ constructor(fileBits, fileName, options = {}) {
		if (arguments.length < 2) throw new TypeError(`Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`);
		super(fileBits, options);
		if (options === null) options = {};
		const lastModified = options.lastModified === void 0 ? Date.now() : Number(options.lastModified);
		if (!Number.isNaN(lastModified)) this.#lastModified = lastModified;
		this.#name = String(fileName);
	}
	get name() {
		return this.#name;
	}
	get lastModified() {
		return this.#lastModified;
	}
	get [Symbol.toStringTag]() {
		return "File";
	}
	static [Symbol.hasInstance](object) {
		return !!object && object instanceof fetch_blob_default && /^(File)$/.test(object[Symbol.toStringTag]);
	}
};
/** @type {typeof globalThis.File} */ const File = _File;
var file_default = File;

//#endregion
//#region node_modules/formdata-polyfill/esm.min.js
/*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
var { toStringTag: t, iterator: i, hasInstance: h } = Symbol, r = Math.random, m = "append,set,get,getAll,delete,keys,values,entries,forEach,constructor".split(","), f = (a, b, c) => (a += "", /^(Blob|File)$/.test(b && b[t]) ? [(c = c !== void 0 ? c + "" : b[t] == "File" ? b.name : "blob", a), b.name !== c || b[t] == "blob" ? new file_default([b], c, b) : b] : [a, b + ""]), e = (c, f$1) => (f$1 ? c : c.replace(/\r?\n|\r/g, "\r\n")).replace(/\n/g, "%0A").replace(/\r/g, "%0D").replace(/"/g, "%22"), x = (n, a, e$1) => {
	if (a.length < e$1) throw new TypeError(`Failed to execute '${n}' on 'FormData': ${e$1} arguments required, but only ${a.length} present.`);
};
/** @type {typeof globalThis.FormData} */
const FormData = class FormData$1 {
	#d = [];
	constructor(...a) {
		if (a.length) throw new TypeError(`Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.`);
	}
	get [t]() {
		return "FormData";
	}
	[i]() {
		return this.entries();
	}
	static [h](o) {
		return o && typeof o === "object" && o[t] === "FormData" && !m.some((m$1) => typeof o[m$1] != "function");
	}
	append(...a) {
		x("append", arguments, 2);
		this.#d.push(f(...a));
	}
	delete(a) {
		x("delete", arguments, 1);
		a += "";
		this.#d = this.#d.filter(([b]) => b !== a);
	}
	get(a) {
		x("get", arguments, 1);
		a += "";
		for (var b = this.#d, l = b.length, c = 0; c < l; c++) if (b[c][0] === a) return b[c][1];
		return null;
	}
	getAll(a, b) {
		x("getAll", arguments, 1);
		b = [];
		a += "";
		this.#d.forEach((c) => c[0] === a && b.push(c[1]));
		return b;
	}
	has(a) {
		x("has", arguments, 1);
		a += "";
		return this.#d.some((b) => b[0] === a);
	}
	forEach(a, b) {
		x("forEach", arguments, 1);
		for (var [c, d] of this) a.call(b, d, c, this);
	}
	set(...a) {
		x("set", arguments, 2);
		var b = [], c = !0;
		a = f(...a);
		this.#d.forEach((d) => {
			d[0] === a[0] ? c && (c = !b.push(a)) : b.push(d);
		});
		c && b.push(a);
		this.#d = b;
	}
	*entries() {
		yield* this.#d;
	}
	*keys() {
		for (var [a] of this) yield a;
	}
	*values() {
		for (var [, a] of this) yield a;
	}
};
/** @param {FormData} F */
function formDataToBlob(F, B = fetch_blob_default) {
	var b = `${r()}${r()}`.replace(/\./g, "").slice(-28).padStart(32, "-"), c = [], p = `--${b}\r\nContent-Disposition: form-data; name="`;
	F.forEach((v, n) => typeof v == "string" ? c.push(p + e(n) + `"\r\n\r\n${v.replace(/\r(?!\n)|(?<!\r)\n/g, "\r\n")}\r\n`) : c.push(p + e(n) + `"; filename="${e(v.name, 1)}"\r\nContent-Type: ${v.type || "application/octet-stream"}\r\n\r\n`, v, "\r\n"));
	c.push(`--${b}--`);
	return new B(c, { type: "multipart/form-data; boundary=" + b });
}

//#endregion
//#region node_modules/node-fetch/src/errors/base.js
var FetchBaseError = class extends Error {
	constructor(message, type) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.type = type;
	}
	get name() {
		return this.constructor.name;
	}
	get [Symbol.toStringTag]() {
		return this.constructor.name;
	}
};

//#endregion
//#region node_modules/node-fetch/src/errors/fetch-error.js
/**
* @typedef {{ address?: string, code: string, dest?: string, errno: number, info?: object, message: string, path?: string, port?: number, syscall: string}} SystemError
*/
/**
* FetchError interface for operational errors
*/
var FetchError = class extends FetchBaseError {
	/**
	* @param  {string} message -      Error message for human
	* @param  {string} [type] -        Error type for machine
	* @param  {SystemError} [systemError] - For Node.js system error
	*/
	constructor(message, type, systemError) {
		super(message, type);
		if (systemError) {
			this.code = this.errno = systemError.code;
			this.erroredSysCall = systemError.syscall;
		}
	}
};

//#endregion
//#region node_modules/node-fetch/src/utils/is.js
/**
* Is.js
*
* Object type checks.
*/
const NAME = Symbol.toStringTag;
/**
* Check if `obj` is a URLSearchParams object
* ref: https://github.com/node-fetch/node-fetch/issues/296#issuecomment-307598143
* @param {*} object - Object to check for
* @return {boolean}
*/
const isURLSearchParameters = (object) => {
	return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
};
/**
* Check if `object` is a W3C `Blob` object (which `File` inherits from)
* @param {*} object - Object to check for
* @return {boolean}
*/
const isBlob = (object) => {
	return object && typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
};
/**
* Check if `obj` is an instance of AbortSignal.
* @param {*} object - Object to check for
* @return {boolean}
*/
const isAbortSignal = (object) => {
	return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
};
/**
* isDomainOrSubdomain reports whether sub is a subdomain (or exact match) of
* the parent domain.
*
* Both domains must already be in canonical form.
* @param {string|URL} original
* @param {string|URL} destination
*/
const isDomainOrSubdomain = (destination, original) => {
	const orig = new URL(original).hostname;
	const dest = new URL(destination).hostname;
	return orig === dest || orig.endsWith(`.${dest}`);
};
/**
* isSameProtocol reports whether the two provided URLs use the same protocol.
*
* Both domains must already be in canonical form.
* @param {string|URL} original
* @param {string|URL} destination
*/
const isSameProtocol = (destination, original) => {
	return new URL(original).protocol === new URL(destination).protocol;
};

//#endregion
//#region node_modules/node-fetch/src/body.js
/**
* Body.js
*
* Body interface provides common methods for Request and Response
*/
const pipeline$1 = promisify(Stream.pipeline);
const INTERNALS$2 = Symbol("Body internals");
/**
* Body mixin
*
* Ref: https://fetch.spec.whatwg.org/#body
*
* @param   Stream  body  Readable stream
* @param   Object  opts  Response options
* @return  Void
*/
var Body = class {
	constructor(body, { size = 0 } = {}) {
		let boundary = null;
		if (body === null) body = null;
		else if (isURLSearchParameters(body)) body = Buffer$1.from(body.toString());
		else if (isBlob(body)) {} else if (Buffer$1.isBuffer(body)) {} else if (types.isAnyArrayBuffer(body)) body = Buffer$1.from(body);
		else if (ArrayBuffer.isView(body)) body = Buffer$1.from(body.buffer, body.byteOffset, body.byteLength);
		else if (body instanceof Stream) {} else if (body instanceof FormData) {
			body = formDataToBlob(body);
			boundary = body.type.split("=")[1];
		} else body = Buffer$1.from(String(body));
		let stream = body;
		if (Buffer$1.isBuffer(body)) stream = Stream.Readable.from(body);
		else if (isBlob(body)) stream = Stream.Readable.from(body.stream());
		this[INTERNALS$2] = {
			body,
			stream,
			boundary,
			disturbed: false,
			error: null
		};
		this.size = size;
		if (body instanceof Stream) body.on("error", (error_) => {
			const error = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
			this[INTERNALS$2].error = error;
		});
	}
	get body() {
		return this[INTERNALS$2].stream;
	}
	get bodyUsed() {
		return this[INTERNALS$2].disturbed;
	}
	/**
	* Decode response as ArrayBuffer
	*
	* @return  Promise
	*/
	async arrayBuffer() {
		const { buffer, byteOffset, byteLength } = await consumeBody(this);
		return buffer.slice(byteOffset, byteOffset + byteLength);
	}
	async formData() {
		const ct = this.headers.get("content-type");
		if (ct.startsWith("application/x-www-form-urlencoded")) {
			const formData = new FormData();
			const parameters = new URLSearchParams(await this.text());
			for (const [name, value] of parameters) formData.append(name, value);
			return formData;
		}
		const { toFormData } = await import("./multipart-parser-v8S9Iu0H.mjs");
		return toFormData(this.body, ct);
	}
	/**
	* Return raw response as Blob
	*
	* @return Promise
	*/
	async blob() {
		const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
		return new fetch_blob_default([await this.arrayBuffer()], { type: ct });
	}
	/**
	* Decode response as json
	*
	* @return  Promise
	*/
	async json() {
		const text = await this.text();
		return JSON.parse(text);
	}
	/**
	* Decode response as text
	*
	* @return  Promise
	*/
	async text() {
		const buffer = await consumeBody(this);
		return new TextDecoder().decode(buffer);
	}
	/**
	* Decode response as buffer (non-spec api)
	*
	* @return  Promise
	*/
	buffer() {
		return consumeBody(this);
	}
};
Body.prototype.buffer = deprecate(Body.prototype.buffer, "Please use 'response.arrayBuffer()' instead of 'response.buffer()'", "node-fetch#buffer");
Object.defineProperties(Body.prototype, {
	body: { enumerable: true },
	bodyUsed: { enumerable: true },
	arrayBuffer: { enumerable: true },
	blob: { enumerable: true },
	json: { enumerable: true },
	text: { enumerable: true },
	data: { get: deprecate(() => {}, "data doesn't exist, use json(), text(), arrayBuffer(), or body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (response)") }
});
/**
* Consume and convert an entire Body to a Buffer.
*
* Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
*
* @return Promise
*/
async function consumeBody(data) {
	if (data[INTERNALS$2].disturbed) throw new TypeError(`body used already for: ${data.url}`);
	data[INTERNALS$2].disturbed = true;
	if (data[INTERNALS$2].error) throw data[INTERNALS$2].error;
	const { body } = data;
	if (body === null) return Buffer$1.alloc(0);
	/* c8 ignore next 3 */
	if (!(body instanceof Stream)) return Buffer$1.alloc(0);
	const accum = [];
	let accumBytes = 0;
	try {
		for await (const chunk of body) {
			if (data.size > 0 && accumBytes + chunk.length > data.size) {
				const error = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
				body.destroy(error);
				throw error;
			}
			accumBytes += chunk.length;
			accum.push(chunk);
		}
	} catch (error) {
		throw error instanceof FetchBaseError ? error : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error.message}`, "system", error);
	}
	if (body.readableEnded === true || body._readableState.ended === true) try {
		if (accum.every((c) => typeof c === "string")) return Buffer$1.from(accum.join(""));
		return Buffer$1.concat(accum, accumBytes);
	} catch (error) {
		throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error.message}`, "system", error);
	}
	else throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
}
/**
* Clone body given Res/Req instance
*
* @param   Mixed   instance       Response or Request instance
* @param   String  highWaterMark  highWaterMark for both PassThrough body streams
* @return  Mixed
*/
const clone = (instance, highWaterMark) => {
	let p1;
	let p2;
	let { body } = instance[INTERNALS$2];
	if (instance.bodyUsed) throw new Error("cannot clone body after it is used");
	if (body instanceof Stream && typeof body.getBoundary !== "function") {
		p1 = new PassThrough({ highWaterMark });
		p2 = new PassThrough({ highWaterMark });
		body.pipe(p1);
		body.pipe(p2);
		instance[INTERNALS$2].stream = p1;
		body = p2;
	}
	return body;
};
const getNonSpecFormDataBoundary = deprecate((body) => body.getBoundary(), "form-data doesn't follow the spec and requires special treatment. Use alternative package", "https://github.com/node-fetch/node-fetch/issues/1167");
/**
* Performs the operation "extract a `Content-Type` value from |object|" as
* specified in the specification:
* https://fetch.spec.whatwg.org/#concept-bodyinit-extract
*
* This function assumes that instance.body is present.
*
* @param {any} body Any options.body input
* @returns {string | null}
*/
const extractContentType = (body, request) => {
	if (body === null) return null;
	if (typeof body === "string") return "text/plain;charset=UTF-8";
	if (isURLSearchParameters(body)) return "application/x-www-form-urlencoded;charset=UTF-8";
	if (isBlob(body)) return body.type || null;
	if (Buffer$1.isBuffer(body) || types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) return null;
	if (body instanceof FormData) return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
	if (body && typeof body.getBoundary === "function") return `multipart/form-data;boundary=${getNonSpecFormDataBoundary(body)}`;
	if (body instanceof Stream) return null;
	return "text/plain;charset=UTF-8";
};
/**
* The Fetch Standard treats this as if "total bytes" is a property on the body.
* For us, we have to explicitly get it with a function.
*
* ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
*
* @param {any} obj.body Body object from the Body instance.
* @returns {number | null}
*/
const getTotalBytes = (request) => {
	const { body } = request[INTERNALS$2];
	if (body === null) return 0;
	if (isBlob(body)) return body.size;
	if (Buffer$1.isBuffer(body)) return body.length;
	if (body && typeof body.getLengthSync === "function") return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
	return null;
};
/**
* Write a Body to a Node.js WritableStream (e.g. http.Request) object.
*
* @param {Stream.Writable} dest The stream to write to.
* @param obj.body Body object from the Body instance.
* @returns {Promise<void>}
*/
const writeToStream = async (dest, { body }) => {
	if (body === null) dest.end();
	else await pipeline$1(body, dest);
};

//#endregion
//#region node_modules/node-fetch/src/headers.js
/**
* Headers.js
*
* Headers class offers convenient helpers
*/
/* c8 ignore next 9 */
const validateHeaderName = typeof http.validateHeaderName === "function" ? http.validateHeaderName : (name) => {
	if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
		const error = /* @__PURE__ */ new TypeError(`Header name must be a valid HTTP token [${name}]`);
		Object.defineProperty(error, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
		throw error;
	}
};
/* c8 ignore next 9 */
const validateHeaderValue = typeof http.validateHeaderValue === "function" ? http.validateHeaderValue : (name, value) => {
	if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
		const error = /* @__PURE__ */ new TypeError(`Invalid character in header content ["${name}"]`);
		Object.defineProperty(error, "code", { value: "ERR_INVALID_CHAR" });
		throw error;
	}
};
/**
* @typedef {Headers | Record<string, string> | Iterable<readonly [string, string]> | Iterable<Iterable<string>>} HeadersInit
*/
/**
* This Fetch API interface allows you to perform various actions on HTTP request and response headers.
* These actions include retrieving, setting, adding to, and removing.
* A Headers object has an associated header list, which is initially empty and consists of zero or more name and value pairs.
* You can add to this using methods like append() (see Examples.)
* In all methods of this interface, header names are matched by case-insensitive byte sequence.
*
*/
var Headers = class Headers extends URLSearchParams {
	/**
	* Headers class
	*
	* @constructor
	* @param {HeadersInit} [init] - Response headers
	*/
	constructor(init) {
		/** @type {string[][]} */
		let result = [];
		if (init instanceof Headers) {
			const raw = init.raw();
			for (const [name, values] of Object.entries(raw)) result.push(...values.map((value) => [name, value]));
		} else if (init == null) {} else if (typeof init === "object" && !types.isBoxedPrimitive(init)) {
			const method = init[Symbol.iterator];
			if (method == null) result.push(...Object.entries(init));
			else {
				if (typeof method !== "function") throw new TypeError("Header pairs must be iterable");
				result = [...init].map((pair) => {
					if (typeof pair !== "object" || types.isBoxedPrimitive(pair)) throw new TypeError("Each header pair must be an iterable object");
					return [...pair];
				}).map((pair) => {
					if (pair.length !== 2) throw new TypeError("Each header pair must be a name/value tuple");
					return [...pair];
				});
			}
		} else throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
		result = result.length > 0 ? result.map(([name, value]) => {
			validateHeaderName(name);
			validateHeaderValue(name, String(value));
			return [String(name).toLowerCase(), String(value)];
		}) : void 0;
		super(result);
		return new Proxy(this, { get(target, p, receiver) {
			switch (p) {
				case "append":
				case "set": return (name, value) => {
					validateHeaderName(name);
					validateHeaderValue(name, String(value));
					return URLSearchParams.prototype[p].call(target, String(name).toLowerCase(), String(value));
				};
				case "delete":
				case "has":
				case "getAll": return (name) => {
					validateHeaderName(name);
					return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
				};
				case "keys": return () => {
					target.sort();
					return new Set(URLSearchParams.prototype.keys.call(target)).keys();
				};
				default: return Reflect.get(target, p, receiver);
			}
		} });
		/* c8 ignore next */
	}
	get [Symbol.toStringTag]() {
		return this.constructor.name;
	}
	toString() {
		return Object.prototype.toString.call(this);
	}
	get(name) {
		const values = this.getAll(name);
		if (values.length === 0) return null;
		let value = values.join(", ");
		if (/^content-encoding$/i.test(name)) value = value.toLowerCase();
		return value;
	}
	forEach(callback, thisArg = void 0) {
		for (const name of this.keys()) Reflect.apply(callback, thisArg, [
			this.get(name),
			name,
			this
		]);
	}
	*values() {
		for (const name of this.keys()) yield this.get(name);
	}
	/**
	* @type {() => IterableIterator<[string, string]>}
	*/
	*entries() {
		for (const name of this.keys()) yield [name, this.get(name)];
	}
	[Symbol.iterator]() {
		return this.entries();
	}
	/**
	* Node-fetch non-spec method
	* returning all headers and their values as array
	* @returns {Record<string, string[]>}
	*/
	raw() {
		return [...this.keys()].reduce((result, key) => {
			result[key] = this.getAll(key);
			return result;
		}, {});
	}
	/**
	* For better console.log(headers) and also to convert Headers into Node.js Request compatible format
	*/
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return [...this.keys()].reduce((result, key) => {
			const values = this.getAll(key);
			if (key === "host") result[key] = values[0];
			else result[key] = values.length > 1 ? values : values[0];
			return result;
		}, {});
	}
};
/**
* Re-shaping object for Web IDL tests
* Only need to do it for overridden methods
*/
Object.defineProperties(Headers.prototype, [
	"get",
	"entries",
	"forEach",
	"values"
].reduce((result, property) => {
	result[property] = { enumerable: true };
	return result;
}, {}));
/**
* Create a Headers object from an http.IncomingMessage.rawHeaders, ignoring those that do
* not conform to HTTP grammar productions.
* @param {import('http').IncomingMessage['rawHeaders']} headers
*/
function fromRawHeaders(headers = []) {
	return new Headers(headers.reduce((result, value, index, array) => {
		if (index % 2 === 0) result.push(array.slice(index, index + 2));
		return result;
	}, []).filter(([name, value]) => {
		try {
			validateHeaderName(name);
			validateHeaderValue(name, String(value));
			return true;
		} catch {
			return false;
		}
	}));
}

//#endregion
//#region node_modules/node-fetch/src/utils/is-redirect.js
const redirectStatus = new Set([
	301,
	302,
	303,
	307,
	308
]);
/**
* Redirect code matching
*
* @param {number} code - Status code
* @return {boolean}
*/
const isRedirect = (code) => {
	return redirectStatus.has(code);
};

//#endregion
//#region node_modules/node-fetch/src/response.js
/**
* Response.js
*
* Response class provides content decoding
*/
const INTERNALS$1 = Symbol("Response internals");
/**
* Response class
*
* Ref: https://fetch.spec.whatwg.org/#response-class
*
* @param   Stream  body  Readable stream
* @param   Object  opts  Response options
* @return  Void
*/
var Response = class Response extends Body {
	constructor(body = null, options = {}) {
		super(body, options);
		const status = options.status != null ? options.status : 200;
		const headers = new Headers(options.headers);
		if (body !== null && !headers.has("Content-Type")) {
			const contentType = extractContentType(body, this);
			if (contentType) headers.append("Content-Type", contentType);
		}
		this[INTERNALS$1] = {
			type: "default",
			url: options.url,
			status,
			statusText: options.statusText || "",
			headers,
			counter: options.counter,
			highWaterMark: options.highWaterMark
		};
	}
	get type() {
		return this[INTERNALS$1].type;
	}
	get url() {
		return this[INTERNALS$1].url || "";
	}
	get status() {
		return this[INTERNALS$1].status;
	}
	/**
	* Convenience property representing if the request ended normally
	*/
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}
	get redirected() {
		return this[INTERNALS$1].counter > 0;
	}
	get statusText() {
		return this[INTERNALS$1].statusText;
	}
	get headers() {
		return this[INTERNALS$1].headers;
	}
	get highWaterMark() {
		return this[INTERNALS$1].highWaterMark;
	}
	/**
	* Clone this response
	*
	* @return  Response
	*/
	clone() {
		return new Response(clone(this, this.highWaterMark), {
			type: this.type,
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok,
			redirected: this.redirected,
			size: this.size,
			highWaterMark: this.highWaterMark
		});
	}
	/**
	* @param {string} url    The URL that the new response is to originate from.
	* @param {number} status An optional status code for the response (e.g., 302.)
	* @returns {Response}    A Response object.
	*/
	static redirect(url, status = 302) {
		if (!isRedirect(status)) throw new RangeError("Failed to execute \"redirect\" on \"response\": Invalid status code");
		return new Response(null, {
			headers: { location: new URL(url).toString() },
			status
		});
	}
	static error() {
		const response = new Response(null, {
			status: 0,
			statusText: ""
		});
		response[INTERNALS$1].type = "error";
		return response;
	}
	static json(data = void 0, init = {}) {
		const body = JSON.stringify(data);
		if (body === void 0) throw new TypeError("data is not JSON serializable");
		const headers = new Headers(init && init.headers);
		if (!headers.has("content-type")) headers.set("content-type", "application/json");
		return new Response(body, {
			...init,
			headers
		});
	}
	get [Symbol.toStringTag]() {
		return "Response";
	}
};
Object.defineProperties(Response.prototype, {
	type: { enumerable: true },
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	redirected: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true }
});

//#endregion
//#region node_modules/node-fetch/src/utils/get-search.js
const getSearch = (parsedURL) => {
	if (parsedURL.search) return parsedURL.search;
	const lastOffset = parsedURL.href.length - 1;
	const hash = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
	return parsedURL.href[lastOffset - hash.length] === "?" ? "?" : "";
};

//#endregion
//#region node_modules/node-fetch/src/utils/referrer.js
/**
* @external URL
* @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL|URL}
*/
/**
* @module utils/referrer
* @private
*/
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#strip-url|Referrer Policy §8.4. Strip url for use as a referrer}
* @param {string} URL
* @param {boolean} [originOnly=false]
*/
function stripURLForUseAsAReferrer(url, originOnly = false) {
	if (url == null) return "no-referrer";
	url = new URL(url);
	if (/^(about|blob|data):$/.test(url.protocol)) return "no-referrer";
	url.username = "";
	url.password = "";
	url.hash = "";
	if (originOnly) {
		url.pathname = "";
		url.search = "";
	}
	return url;
}
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#enumdef-referrerpolicy|enum ReferrerPolicy}
*/
const ReferrerPolicy = new Set([
	"",
	"no-referrer",
	"no-referrer-when-downgrade",
	"same-origin",
	"origin",
	"strict-origin",
	"origin-when-cross-origin",
	"strict-origin-when-cross-origin",
	"unsafe-url"
]);
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#default-referrer-policy|default referrer policy}
*/
const DEFAULT_REFERRER_POLICY = "strict-origin-when-cross-origin";
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#referrer-policies|Referrer Policy §3. Referrer Policies}
* @param {string} referrerPolicy
* @returns {string} referrerPolicy
*/
function validateReferrerPolicy(referrerPolicy) {
	if (!ReferrerPolicy.has(referrerPolicy)) throw new TypeError(`Invalid referrerPolicy: ${referrerPolicy}`);
	return referrerPolicy;
}
/**
* @see {@link https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy|Referrer Policy §3.2. Is origin potentially trustworthy?}
* @param {external:URL} url
* @returns `true`: "Potentially Trustworthy", `false`: "Not Trustworthy"
*/
function isOriginPotentiallyTrustworthy(url) {
	if (/^(http|ws)s:$/.test(url.protocol)) return true;
	const hostIp = url.host.replace(/(^\[)|(]$)/g, "");
	const hostIPVersion = isIP(hostIp);
	if (hostIPVersion === 4 && /^127\./.test(hostIp)) return true;
	if (hostIPVersion === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(hostIp)) return true;
	if (url.host === "localhost" || url.host.endsWith(".localhost")) return false;
	if (url.protocol === "file:") return true;
	return false;
}
/**
* @see {@link https://w3c.github.io/webappsec-secure-contexts/#is-url-trustworthy|Referrer Policy §3.3. Is url potentially trustworthy?}
* @param {external:URL} url
* @returns `true`: "Potentially Trustworthy", `false`: "Not Trustworthy"
*/
function isUrlPotentiallyTrustworthy(url) {
	if (/^about:(blank|srcdoc)$/.test(url)) return true;
	if (url.protocol === "data:") return true;
	if (/^(blob|filesystem):$/.test(url.protocol)) return true;
	return isOriginPotentiallyTrustworthy(url);
}
/**
* Modifies the referrerURL to enforce any extra security policy considerations.
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}, step 7
* @callback module:utils/referrer~referrerURLCallback
* @param {external:URL} referrerURL
* @returns {external:URL} modified referrerURL
*/
/**
* Modifies the referrerOrigin to enforce any extra security policy considerations.
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}, step 7
* @callback module:utils/referrer~referrerOriginCallback
* @param {external:URL} referrerOrigin
* @returns {external:URL} modified referrerOrigin
*/
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#determine-requests-referrer|Referrer Policy §8.3. Determine request's Referrer}
* @param {Request} request
* @param {object} o
* @param {module:utils/referrer~referrerURLCallback} o.referrerURLCallback
* @param {module:utils/referrer~referrerOriginCallback} o.referrerOriginCallback
* @returns {external:URL} Request's referrer
*/
function determineRequestsReferrer(request, { referrerURLCallback, referrerOriginCallback } = {}) {
	if (request.referrer === "no-referrer" || request.referrerPolicy === "") return null;
	const policy = request.referrerPolicy;
	if (request.referrer === "about:client") return "no-referrer";
	const referrerSource = request.referrer;
	let referrerURL = stripURLForUseAsAReferrer(referrerSource);
	let referrerOrigin = stripURLForUseAsAReferrer(referrerSource, true);
	if (referrerURL.toString().length > 4096) referrerURL = referrerOrigin;
	if (referrerURLCallback) referrerURL = referrerURLCallback(referrerURL);
	if (referrerOriginCallback) referrerOrigin = referrerOriginCallback(referrerOrigin);
	const currentURL = new URL(request.url);
	switch (policy) {
		case "no-referrer": return "no-referrer";
		case "origin": return referrerOrigin;
		case "unsafe-url": return referrerURL;
		case "strict-origin":
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) return "no-referrer";
			return referrerOrigin.toString();
		case "strict-origin-when-cross-origin":
			if (referrerURL.origin === currentURL.origin) return referrerURL;
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) return "no-referrer";
			return referrerOrigin;
		case "same-origin":
			if (referrerURL.origin === currentURL.origin) return referrerURL;
			return "no-referrer";
		case "origin-when-cross-origin":
			if (referrerURL.origin === currentURL.origin) return referrerURL;
			return referrerOrigin;
		case "no-referrer-when-downgrade":
			if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) return "no-referrer";
			return referrerURL;
		default: throw new TypeError(`Invalid referrerPolicy: ${policy}`);
	}
}
/**
* @see {@link https://w3c.github.io/webappsec-referrer-policy/#parse-referrer-policy-from-header|Referrer Policy §8.1. Parse a referrer policy from a Referrer-Policy header}
* @param {Headers} headers Response headers
* @returns {string} policy
*/
function parseReferrerPolicyFromHeader(headers) {
	const policyTokens = (headers.get("referrer-policy") || "").split(/[,\s]+/);
	let policy = "";
	for (const token of policyTokens) if (token && ReferrerPolicy.has(token)) policy = token;
	return policy;
}

//#endregion
//#region node_modules/node-fetch/src/request.js
/**
* Request.js
*
* Request class contains server only options
*
* All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
*/
const INTERNALS = Symbol("Request internals");
/**
* Check if `obj` is an instance of Request.
*
* @param  {*} object
* @return {boolean}
*/
const isRequest = (object) => {
	return typeof object === "object" && typeof object[INTERNALS] === "object";
};
const doBadDataWarn = deprecate(() => {}, ".data is not a valid RequestInit property, use .body instead", "https://github.com/node-fetch/node-fetch/issues/1000 (request)");
/**
* Request class
*
* Ref: https://fetch.spec.whatwg.org/#request-class
*
* @param   Mixed   input  Url or Request instance
* @param   Object  init   Custom options
* @return  Void
*/
var Request = class Request extends Body {
	constructor(input, init = {}) {
		let parsedURL;
		if (isRequest(input)) parsedURL = new URL(input.url);
		else {
			parsedURL = new URL(input);
			input = {};
		}
		if (parsedURL.username !== "" || parsedURL.password !== "") throw new TypeError(`${parsedURL} is an url with embedded credentials.`);
		let method = init.method || input.method || "GET";
		if (/^(delete|get|head|options|post|put)$/i.test(method)) method = method.toUpperCase();
		if (!isRequest(init) && "data" in init) doBadDataWarn();
		if ((init.body != null || isRequest(input) && input.body !== null) && (method === "GET" || method === "HEAD")) throw new TypeError("Request with GET/HEAD method cannot have body");
		const inputBody = init.body ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;
		super(inputBody, { size: init.size || input.size || 0 });
		const headers = new Headers(init.headers || input.headers || {});
		if (inputBody !== null && !headers.has("Content-Type")) {
			const contentType = extractContentType(inputBody, this);
			if (contentType) headers.set("Content-Type", contentType);
		}
		let signal = isRequest(input) ? input.signal : null;
		if ("signal" in init) signal = init.signal;
		if (signal != null && !isAbortSignal(signal)) throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
		let referrer = init.referrer == null ? input.referrer : init.referrer;
		if (referrer === "") referrer = "no-referrer";
		else if (referrer) {
			const parsedReferrer = new URL(referrer);
			referrer = /^about:(\/\/)?client$/.test(parsedReferrer) ? "client" : parsedReferrer;
		} else referrer = void 0;
		this[INTERNALS] = {
			method,
			redirect: init.redirect || input.redirect || "follow",
			headers,
			parsedURL,
			signal,
			referrer
		};
		this.follow = init.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init.follow;
		this.compress = init.compress === void 0 ? input.compress === void 0 ? true : input.compress : init.compress;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
		this.highWaterMark = init.highWaterMark || input.highWaterMark || 16384;
		this.insecureHTTPParser = init.insecureHTTPParser || input.insecureHTTPParser || false;
		this.referrerPolicy = init.referrerPolicy || input.referrerPolicy || "";
	}
	/** @returns {string} */
	get method() {
		return this[INTERNALS].method;
	}
	/** @returns {string} */
	get url() {
		return format(this[INTERNALS].parsedURL);
	}
	/** @returns {Headers} */
	get headers() {
		return this[INTERNALS].headers;
	}
	get redirect() {
		return this[INTERNALS].redirect;
	}
	/** @returns {AbortSignal} */
	get signal() {
		return this[INTERNALS].signal;
	}
	get referrer() {
		if (this[INTERNALS].referrer === "no-referrer") return "";
		if (this[INTERNALS].referrer === "client") return "about:client";
		if (this[INTERNALS].referrer) return this[INTERNALS].referrer.toString();
	}
	get referrerPolicy() {
		return this[INTERNALS].referrerPolicy;
	}
	set referrerPolicy(referrerPolicy) {
		this[INTERNALS].referrerPolicy = validateReferrerPolicy(referrerPolicy);
	}
	/**
	* Clone this request
	*
	* @return  Request
	*/
	clone() {
		return new Request(this);
	}
	get [Symbol.toStringTag]() {
		return "Request";
	}
};
Object.defineProperties(Request.prototype, {
	method: { enumerable: true },
	url: { enumerable: true },
	headers: { enumerable: true },
	redirect: { enumerable: true },
	clone: { enumerable: true },
	signal: { enumerable: true },
	referrer: { enumerable: true },
	referrerPolicy: { enumerable: true }
});
/**
* Convert a Request to Node.js http request options.
*
* @param {Request} request - A Request instance
* @return The options object to be passed to http.request
*/
const getNodeRequestOptions = (request) => {
	const { parsedURL } = request[INTERNALS];
	const headers = new Headers(request[INTERNALS].headers);
	if (!headers.has("Accept")) headers.set("Accept", "*/*");
	let contentLengthValue = null;
	if (request.body === null && /^(post|put)$/i.test(request.method)) contentLengthValue = "0";
	if (request.body !== null) {
		const totalBytes = getTotalBytes(request);
		if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) contentLengthValue = String(totalBytes);
	}
	if (contentLengthValue) headers.set("Content-Length", contentLengthValue);
	if (request.referrerPolicy === "") request.referrerPolicy = DEFAULT_REFERRER_POLICY;
	if (request.referrer && request.referrer !== "no-referrer") request[INTERNALS].referrer = determineRequestsReferrer(request);
	else request[INTERNALS].referrer = "no-referrer";
	if (request[INTERNALS].referrer instanceof URL) headers.set("Referer", request.referrer);
	if (!headers.has("User-Agent")) headers.set("User-Agent", "node-fetch");
	if (request.compress && !headers.has("Accept-Encoding")) headers.set("Accept-Encoding", "gzip, deflate, br");
	let { agent } = request;
	if (typeof agent === "function") agent = agent(parsedURL);
	const search = getSearch(parsedURL);
	return {
		parsedURL,
		options: {
			path: parsedURL.pathname + search,
			method: request.method,
			headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
			insecureHTTPParser: request.insecureHTTPParser,
			agent
		}
	};
};

//#endregion
//#region node_modules/node-fetch/src/errors/abort-error.js
/**
* AbortError interface for cancelled requests
*/
var AbortError = class extends FetchBaseError {
	constructor(message, type = "aborted") {
		super(message, type);
	}
};

//#endregion
//#region node_modules/node-domexception/index.js
var require_node_domexception = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
	if (!globalThis.DOMException) try {
		const { MessageChannel } = __require("worker_threads"), port = new MessageChannel().port1, ab = /* @__PURE__ */ new ArrayBuffer();
		port.postMessage(ab, [ab, ab]);
	} catch (err) {
		err.constructor.name === "DOMException" && (globalThis.DOMException = err.constructor);
	}
	module.exports = globalThis.DOMException;
}));

//#endregion
//#region node_modules/fetch-blob/from.js
var import_node_domexception = /* @__PURE__ */ __toESM(require_node_domexception(), 1);
const { stat } = promises;
/**
* This is a blob backed up by a file on the disk
* with minium requirement. Its wrapped around a Blob as a blobPart
* so you have no direct access to this.
*
* @private
*/
var BlobDataItem = class BlobDataItem {
	#path;
	#start;
	constructor(options) {
		this.#path = options.path;
		this.#start = options.start;
		this.size = options.size;
		this.lastModified = options.lastModified;
	}
	/**
	* Slicing arguments is first validated and formatted
	* to not be out of range by Blob.prototype.slice
	*/
	slice(start, end) {
		return new BlobDataItem({
			path: this.#path,
			lastModified: this.lastModified,
			size: end - start,
			start: this.#start + start
		});
	}
	async *stream() {
		const { mtimeMs } = await stat(this.#path);
		if (mtimeMs > this.lastModified) throw new import_node_domexception.default("The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired.", "NotReadableError");
		yield* createReadStream(this.#path, {
			start: this.#start,
			end: this.#start + this.size - 1
		});
	}
	get [Symbol.toStringTag]() {
		return "Blob";
	}
};

//#endregion
//#region node_modules/node-fetch/src/index.js
/**
* Index.js
*
* a request API compatible with window.fetch
*
* All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
*/
const supportedSchemas = new Set([
	"data:",
	"http:",
	"https:"
]);
/**
* Fetch function
*
* @param   {string | URL | import('./request').default} url - Absolute url or Request instance
* @param   {*} [options_] - Fetch options
* @return  {Promise<import('./response').default>}
*/
async function fetch(url, options_) {
	return new Promise((resolve, reject) => {
		const request = new Request(url, options_);
		const { parsedURL, options } = getNodeRequestOptions(request);
		if (!supportedSchemas.has(parsedURL.protocol)) throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${parsedURL.protocol.replace(/:$/, "")}" is not supported.`);
		if (parsedURL.protocol === "data:") {
			const data = dist_default(request.url);
			resolve(new Response(data, { headers: { "Content-Type": data.typeFull } }));
			return;
		}
		const send = (parsedURL.protocol === "https:" ? https : http).request;
		const { signal } = request;
		let response = null;
		const abort = () => {
			const error = new AbortError("The operation was aborted.");
			reject(error);
			if (request.body && request.body instanceof Stream.Readable) request.body.destroy(error);
			if (!response || !response.body) return;
			response.body.emit("error", error);
		};
		if (signal && signal.aborted) {
			abort();
			return;
		}
		const abortAndFinalize = () => {
			abort();
			finalize();
		};
		const request_ = send(parsedURL.toString(), options);
		if (signal) signal.addEventListener("abort", abortAndFinalize);
		const finalize = () => {
			request_.abort();
			if (signal) signal.removeEventListener("abort", abortAndFinalize);
		};
		request_.on("error", (error) => {
			reject(new FetchError(`request to ${request.url} failed, reason: ${error.message}`, "system", error));
			finalize();
		});
		fixResponseChunkedTransferBadEnding(request_, (error) => {
			if (response && response.body) response.body.destroy(error);
		});
		/* c8 ignore next 18 */
		if (process.version < "v14") request_.on("socket", (s) => {
			let endedWithEventsCount;
			s.prependListener("end", () => {
				endedWithEventsCount = s._eventsCount;
			});
			s.prependListener("close", (hadError) => {
				if (response && endedWithEventsCount < s._eventsCount && !hadError) {
					const error = /* @__PURE__ */ new Error("Premature close");
					error.code = "ERR_STREAM_PREMATURE_CLOSE";
					response.body.emit("error", error);
				}
			});
		});
		request_.on("response", (response_) => {
			request_.setTimeout(0);
			const headers = fromRawHeaders(response_.rawHeaders);
			if (isRedirect(response_.statusCode)) {
				const location = headers.get("Location");
				let locationURL = null;
				try {
					locationURL = location === null ? null : new URL(location, request.url);
				} catch {
					if (request.redirect !== "manual") {
						reject(new FetchError(`uri requested responds with an invalid redirect URL: ${location}`, "invalid-redirect"));
						finalize();
						return;
					}
				}
				switch (request.redirect) {
					case "error":
						reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
						finalize();
						return;
					case "manual": break;
					case "follow": {
						if (locationURL === null) break;
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
							finalize();
							return;
						}
						const requestOptions = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: clone(request),
							signal: request.signal,
							size: request.size,
							referrer: request.referrer,
							referrerPolicy: request.referrerPolicy
						};
						if (!isDomainOrSubdomain(request.url, locationURL) || !isSameProtocol(request.url, locationURL)) for (const name of [
							"authorization",
							"www-authenticate",
							"cookie",
							"cookie2"
						]) requestOptions.headers.delete(name);
						if (response_.statusCode !== 303 && request.body && options_.body instanceof Stream.Readable) {
							reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
							finalize();
							return;
						}
						if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
							requestOptions.method = "GET";
							requestOptions.body = void 0;
							requestOptions.headers.delete("content-length");
						}
						const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
						if (responseReferrerPolicy) requestOptions.referrerPolicy = responseReferrerPolicy;
						resolve(fetch(new Request(locationURL, requestOptions)));
						finalize();
						return;
					}
					default: return reject(/* @__PURE__ */ new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
				}
			}
			if (signal) response_.once("end", () => {
				signal.removeEventListener("abort", abortAndFinalize);
			});
			let body = pipeline(response_, new PassThrough(), (error) => {
				if (error) reject(error);
			});
			/* c8 ignore next 3 */
			if (process.version < "v12.10") response_.on("aborted", abortAndFinalize);
			const responseOptions = {
				url: request.url,
				status: response_.statusCode,
				statusText: response_.statusMessage,
				headers,
				size: request.size,
				counter: request.counter,
				highWaterMark: request.highWaterMark
			};
			const codings = headers.get("Content-Encoding");
			if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}
			const zlibOptions = {
				flush: zlib.Z_SYNC_FLUSH,
				finishFlush: zlib.Z_SYNC_FLUSH
			};
			if (codings === "gzip" || codings === "x-gzip") {
				body = pipeline(body, zlib.createGunzip(zlibOptions), (error) => {
					if (error) reject(error);
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}
			if (codings === "deflate" || codings === "x-deflate") {
				const raw = pipeline(response_, new PassThrough(), (error) => {
					if (error) reject(error);
				});
				raw.once("data", (chunk) => {
					if ((chunk[0] & 15) === 8) body = pipeline(body, zlib.createInflate(), (error) => {
						if (error) reject(error);
					});
					else body = pipeline(body, zlib.createInflateRaw(), (error) => {
						if (error) reject(error);
					});
					response = new Response(body, responseOptions);
					resolve(response);
				});
				raw.once("end", () => {
					if (!response) {
						response = new Response(body, responseOptions);
						resolve(response);
					}
				});
				return;
			}
			if (codings === "br") {
				body = pipeline(body, zlib.createBrotliDecompress(), (error) => {
					if (error) reject(error);
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}
			response = new Response(body, responseOptions);
			resolve(response);
		});
		writeToStream(request_, request).catch(reject);
	});
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
	const LAST_CHUNK = Buffer$1.from("0\r\n\r\n");
	let isChunkedTransfer = false;
	let properLastChunkReceived = false;
	let previousChunk;
	request.on("response", (response) => {
		const { headers } = response;
		isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
	});
	request.on("socket", (socket) => {
		const onSocketClose = () => {
			if (isChunkedTransfer && !properLastChunkReceived) {
				const error = /* @__PURE__ */ new Error("Premature close");
				error.code = "ERR_STREAM_PREMATURE_CLOSE";
				errorCallback(error);
			}
		};
		const onData = (buf) => {
			properLastChunkReceived = Buffer$1.compare(buf.slice(-5), LAST_CHUNK) === 0;
			if (!properLastChunkReceived && previousChunk) properLastChunkReceived = Buffer$1.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer$1.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
			previousChunk = buf;
		};
		socket.prependListener("close", onSocketClose);
		socket.on("data", onData);
		request.on("close", () => {
			socket.removeListener("close", onSocketClose);
			socket.removeListener("data", onData);
		});
	});
}

//#endregion
//#region src/main.ts
let mainWindow = null;
let pythonProcess = null;
let rustProcess = null;
const PYTHON_TOKEN = "54321";
const PYTHON_PORT = 8e3;
const RUST_PORT = 5005;
const CSP_NONCE = randomBytes(16).toString("base64");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function setupSessionSecurity() {
	const styleSrc = !app.isPackaged ? "'self' 'unsafe-inline'" : `'self' 'nonce-${CSP_NONCE}'`;
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({ responseHeaders: {
			...details.responseHeaders,
			"Content-Security-Policy": [
				"default-src 'self'",
				"script-src 'self'",
				`style-src ${styleSrc}`,
				"img-src 'self' data:",
				`connect-src 'self' http://127.0.0.1:${PYTHON_PORT} http://127.0.0.1:${RUST_PORT}`
			].join("; ")
		} });
	});
}
async function createWindow() {
	await setupSessionSecurity();
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true
		}
	});
	mainWindow.once("ready-to-show", () => mainWindow?.show());
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});
	if (process.env.NODE_ENV === "development") await mainWindow.loadURL("http://localhost:5173");
	else if (process.env.VITE_DEV_SERVER_URL) await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else await mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
	mainWindow.webContents.on("dom-ready", () => {
		mainWindow?.webContents.executeJavaScript(`window.__CSP_NONCE__ = "${CSP_NONCE}";`);
	});
	await startSidecars();
	await checkHealth();
}
async function startSidecars() {
	const backendDir = path.join(__dirname, "../../backend");
	const rustDir = path.join(__dirname, "../../rust");
	const pythonPath = path.join(backendDir, "venv", "Scripts", "python.exe");
	const rustExe = path.join(rustDir, "target/debug/rust.exe");
	console.log("📂 Backend dir:", backendDir);
	console.log("📂 Rust dir:", rustDir);
	console.log("🔍 Looking for Rust exe:", rustExe);
	if (!fs.existsSync(rustExe)) {
		console.error("❌ Rust executable not found!");
		dialog.showErrorBox("Rust Sidecar Missing", `rust.exe not found at:\n${rustExe}\n\nBuild it with: cargo build`);
		app.quit();
		return;
	}
	const modelPath = path.join(rustDir, "models", "mistral-7b-instruct-v0.2.Q4_K_S.gguf");
	if (!fs.existsSync(modelPath)) {
		console.error("❌ Model file not found!");
		dialog.showErrorBox("Model Missing", `Model not found at:\n${modelPath}\n\nPlease download the model first.`);
		app.quit();
		return;
	}
	console.log("✅ Rust exe found");
	console.log("✅ Model file found");
	console.log("🚀 Starting Rust LLM server...");
	rustProcess = spawn(rustExe, [], {
		cwd: rustDir,
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		],
		env: {
			...process.env,
			PORT: String(RUST_PORT),
			RUST_LOG: "info"
		},
		windowsHide: true
	});
	if (rustProcess.stdout) rustProcess.stdout.on("data", (data) => {
		console.log(`[Rust] ${data.toString().trim()}`);
	});
	if (rustProcess.stderr) rustProcess.stderr.on("data", (data) => {
		console.error(`[Rust Error] ${data.toString().trim()}`);
	});
	rustProcess.on("error", (err) => {
		console.error("❌ Rust process error:", err);
	});
	rustProcess.on("exit", (code) => {
		console.log(`Rust process exited with code ${code}`);
	});
	console.log("⏳ Waiting for Rust server...");
	for (let i$1 = 0; i$1 < 30; i$1++) {
		try {
			if ((await fetch(`http://127.0.0.1:${RUST_PORT}/health`)).ok) {
				console.log("✅ Rust server ready!");
				break;
			}
		} catch (e$1) {}
		await new Promise((r$1) => setTimeout(r$1, 1e3));
	}
	console.log("🚀 Starting Python FastAPI server...");
	pythonProcess = spawn(pythonPath, [
		"-m",
		"uvicorn",
		"main:app",
		"--host",
		"127.0.0.1",
		"--port",
		String(PYTHON_PORT),
		"--log-level",
		"info"
	], {
		cwd: backendDir,
		env: {
			...process.env,
			PYTHON_TOKEN,
			RUST_URL: `http://127.0.0.1:${RUST_PORT}`,
			VIRTUAL_ENV: path.join(backendDir, "venv"),
			PATH: `${path.join(backendDir, "venv", "Scripts")};${process.env.PATH}`
		},
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		],
		windowsHide: true
	});
	if (pythonProcess.stdout) pythonProcess.stdout.on("data", (data) => {
		console.log(`[Python] ${data.toString().trim()}`);
	});
	if (pythonProcess.stderr) pythonProcess.stderr.on("data", (data) => {
		console.error(`[Python Error] ${data.toString().trim()}`);
	});
	pythonProcess.on("error", (err) => {
		console.error("❌ Python process error:", err);
	});
	pythonProcess.on("exit", (code) => {
		console.log(`Python process exited with code ${code}`);
	});
	console.log("⏳ Waiting for Python server...");
	for (let i$1 = 0; i$1 < 30; i$1++) {
		try {
			if ((await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, { headers: { "x-token": PYTHON_TOKEN } })).ok) {
				console.log("✅ Python server ready!");
				return;
			}
		} catch (e$1) {}
		await new Promise((r$1) => setTimeout(r$1, 1e3));
	}
	console.error("❌ Python server failed to start");
	dialog.showErrorBox("Server Start Failed", "Python backend did not respond in time");
}
const checkHealth = async () => {
	try {
		if ((await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`, { headers: { "x-token": PYTHON_TOKEN } })).ok) {
			console.log("✅ Health check passed");
			return true;
		}
	} catch (e$1) {
		console.error("❌ Health check failed:", e$1);
	}
	return false;
};
ipcMain.handle("ai:request", async (_event, payload) => {
	const { target = "python", endpoint, method = "POST", body } = payload;
	const port = target === "rust" ? RUST_PORT : PYTHON_PORT;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 18e4);
		const res = await fetch(`http://127.0.0.1:${port}${endpoint}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				"x-token": PYTHON_TOKEN
			},
			body: body ? JSON.stringify(body) : void 0,
			signal: controller.signal
		});
		clearTimeout(timeout);
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`Backend error: ${res.statusText} - ${errorText}`);
		}
		return await res.json();
	} catch (error) {
		console.error(`IPC Request Failed [${endpoint}]:`, error.message);
		return { error: error.message || "Request failed" };
	}
});
ipcMain.handle("ai:request-stream", async (event, payload) => {
	const { endpoint, method = "POST", body } = payload;
	console.log(`📡 Stream request: ${endpoint}`);
	try {
		const response = await fetch(`http://127.0.0.1:${PYTHON_PORT}${endpoint}`, {
			method,
			headers: {
				"Content-Type": "application/json",
				"x-token": PYTHON_TOKEN,
				Accept: "text/event-stream"
			},
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Backend error: ${response.statusText} - ${errorText}`);
		}
		if (!response.body) throw new Error("Response body is empty");
		console.log("✅ Stream connected");
		let buffer = "";
		response.body.on("data", (chunk) => {
			buffer += chunk.toString();
			let boundary = buffer.indexOf("\n\n");
			while (boundary !== -1) {
				const evt = buffer.slice(0, boundary).trim();
				buffer = buffer.slice(boundary + 2);
				if (evt.startsWith("data:")) {
					const jsonStr = evt.slice(5).trim();
					try {
						const parsed = JSON.parse(jsonStr);
						event.sender.send("ai:stream-data", parsed);
					} catch (e$1) {
						console.warn("Failed to parse SSE data:", jsonStr);
					}
				}
				boundary = buffer.indexOf("\n\n");
			}
		});
		response.body.on("end", () => {
			console.log("✅ Stream ended");
			event.sender.send("ai:stream-end");
		});
		response.body.on("error", (err) => {
			console.error("❌ Stream error:", err);
			event.sender.send("ai:stream-error", { error: err.message });
		});
		return { success: true };
	} catch (error) {
		console.error("❌ Stream setup failed:", error.message);
		event.sender.send("ai:stream-error", { error: error.message });
		return { error: error.message };
	}
});
ipcMain.handle("dialog:openFolder", async () => {
	return (await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "multiSelections"] })).filePaths;
});
app.on("before-quit", () => {
	console.log("🛑 Shutting down processes...");
	pythonProcess?.kill();
	rustProcess?.kill();
});
app.whenReady().then(createWindow);

//#endregion
export { file_default as n, FormData as t };