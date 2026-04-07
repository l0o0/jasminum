function serializeValue(value) {
	if (value === undefined) {
		return null;
	}
	return JSON.parse(JSON.stringify(value));
}

function serializeError(error) {
	return {
		name: error?.name || "Error",
		message: error?.message || String(error),
		stack: error?.stack || "",
	};
}

function getValueSetter(win, element) {
	if (element instanceof win.HTMLTextAreaElement) {
		return Object.getOwnPropertyDescriptor(
			win.HTMLTextAreaElement.prototype,
			"value",
		)?.set;
	}
	if (element instanceof win.HTMLInputElement) {
		return Object.getOwnPropertyDescriptor(
			win.HTMLInputElement.prototype,
			"value",
		)?.set;
	}
	return null;
}

function waitForDocumentReady(document, { allowInteractiveAfter = 0 } = {}) {
	if (!document) {
		return Promise.resolve();
	}

	const readyState = document.readyState;
	if (readyState === "complete") {
		return Promise.resolve();
	}
	if (readyState === "interactive" && allowInteractiveAfter !== false) {
		return new Promise((resolve) => {
			setTimeout(resolve, allowInteractiveAfter || 0);
		});
	}

	return new Promise((resolve) => {
		const onReadyStateChange = () => {
			const state = document.readyState;
			if (state === "complete") {
				cleanup();
				resolve();
				return;
			}
			if (state === "interactive" && allowInteractiveAfter !== false) {
				cleanup();
				setTimeout(resolve, allowInteractiveAfter || 0);
			}
		};

		const cleanup = () => {
			document.removeEventListener("readystatechange", onReadyStateChange, true);
			document.removeEventListener("DOMContentLoaded", onReadyStateChange, true);
			document.defaultView?.removeEventListener("load", onReadyStateChange, true);
		};

		document.addEventListener("readystatechange", onReadyStateChange, true);
		document.addEventListener("DOMContentLoaded", onReadyStateChange, true);
		document.defaultView?.addEventListener("load", onReadyStateChange, true);
		onReadyStateChange();
	});
}

export class JasminumHeadlessChild extends JSWindowActorChild {
	_getWindow() {
		if (!this.contentWindow) {
			throw new Error("Headless actor contentWindow is not available");
		}
		return this.contentWindow;
	}

	_getDocument() {
		const doc = this.document;
		if (!doc) {
			throw new Error("Headless actor document is not available");
		}
		return doc;
	}

	_getElement(selector) {
		const element = this._getDocument().querySelector(selector);
		if (!element) {
			throw new Error(`Element not found for selector: ${selector}`);
		}
		return element;
	}

	async receiveMessage(message) {
		const doc = this.document;
		if (doc) {
			await waitForDocumentReady(doc, { allowInteractiveAfter: 0 });
		}

		switch (message.name) {
			case "evaluate":
				return this._evaluate(message.data || {});

			case "click":
				return this._click(message.data || {});

			case "fill":
				return this._fill(message.data || {});

			case "press":
				return this._press(message.data || {});
		}

		throw new Error(`Unknown headless actor message: ${message.name}`);
	}

	async _evaluate(payload) {
		try {
			const fn = eval(`(${payload.source})`);
			if (typeof fn !== "function") {
				throw new Error("evaluate() expects a function source");
			}
			const value = await fn(
				this._getWindow(),
				this._getDocument(),
				...(payload.args || []),
			);
			return {
				ok: true,
				value: serializeValue(value),
			};
		}
		catch (error) {
			return {
				ok: false,
				error: serializeError(error),
			};
		}
	}

	_click(payload) {
		const win = this._getWindow();
		const element = this._getElement(payload.selector);
		element.scrollIntoView?.({ block: "center", inline: "center" });
		element.click();
		return {
			url: win.location.href,
		};
	}

	_fill(payload) {
		const win = this._getWindow();
		const element = this._getElement(payload.selector);

		if (
			!(
				element instanceof win.HTMLInputElement
				|| element instanceof win.HTMLTextAreaElement
				|| element instanceof win.HTMLSelectElement
			)
		) {
			throw new Error(`Element is not a form control: ${payload.selector}`);
		}

		element.focus?.();

		if (element instanceof win.HTMLSelectElement) {
			element.value = payload.value;
		}
		else {
			const setter = getValueSetter(win, element);
			const nextValue = payload.value == null ? "" : String(payload.value);
			if (payload.clear !== false && setter) {
				setter.call(element, "");
			}
			if (setter) {
				setter.call(element, nextValue);
			}
			else {
				element.value = nextValue;
			}
		}

		element.dispatchEvent(
			new win.Event("input", { bubbles: true, cancelable: true }),
		);
		if (payload.dispatchChange !== false) {
			element.dispatchEvent(
				new win.Event("change", { bubbles: true, cancelable: true }),
			);
		}
		if (payload.blur) {
			element.blur?.();
		}

		return {
			value: element.value,
			url: win.location.href,
		};
	}

	_press(payload) {
		const win = this._getWindow();
		const doc = this._getDocument();
		const target = payload.selector
			? this._getElement(payload.selector)
			: doc.activeElement || doc.body;

		target?.focus?.();

		const eventInit = {
			key: payload.key,
			code: payload.code || payload.key,
			keyCode: payload.keyCode || (payload.key === "Enter" ? 13 : 0),
			which: payload.keyCode || (payload.key === "Enter" ? 13 : 0),
			bubbles: true,
			cancelable: true,
		};

		for (const type of ["keydown", "keypress", "keyup"]) {
			target?.dispatchEvent(new win.KeyboardEvent(type, eventInit));
		}

		if (payload.key === "Enter" && target instanceof win.HTMLInputElement) {
			target.form?.requestSubmit?.();
		}

		return {
			url: win.location.href,
		};
	}
}
