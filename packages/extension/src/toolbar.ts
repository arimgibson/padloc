import { browser } from "webextension-polyfill-ts";
// import { totp } from "@padloc/core/src/otp";
// import { base32ToBytes } from "@padloc/core/src/encoding";
import { config } from "@padloc/app/src/styles";
import { BaseElement, html, property, css, element } from "@padloc/app/src/elements/base";
import { VaultItem } from "@padloc/core/src/item";
import "@padloc/app/src/elements/icon";

@element("pl-extension-toolbar")
export class ExtensionToolbar extends BaseElement {
    @property()
    item: VaultItem | null = null;

    @property()
    private _fieldIndex = 0;

    private _lastFilledInput: HTMLInputElement | null = null;

    static styles = [
        config.cssVars,
        css`
            :host {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999999;
                display: flex;
                justify-content: center;
                align-items: flex-end;
                font-family: var(--font-family);
                padding: 10px;
                font-size: 14px;
                color: var(--color-secondary);
                pointer-events: none;
                will-change: transform;
                transform-origin: top right;
                transition: transform 0.5s;
                text-align: left;
            }

            :host(:not(.showing)) {
                transform: scale(0);
                transition: transform 0.5s;
            }

            .inner {
                pointer-events: auto;
                border-radius: var(--border-radius);
                max-width: 100%;
                background: var(--color-tertiary);
                border: solid 1px #ddd;
                border-bottom-width: 3px;
                box-shadow: rgba(0, 0, 0, 0.1) 0 0 20px;
                padding: 4px;
            }

            .header {
                display: flex;
                align-items: center;
                margin-bottom: 4px;
            }

            .title {
                flex: 1;
                margin-right: 4px;
                font-weight: 600;
                font-size: 1.1em;
                padding: 6px 6px 0 6px;
            }

            .hint {
                opacity: 0.5;
                font-size: 0.9em;
                padding: 0 6px 6px 6px;
            }

            .fields {
                display: flex;
                overflow-x: auto;
            }

            .field-index {
                background: rgba(0, 0, 0, 0.08);
                border: solid 1px rgba(0, 0, 0, 0.1);
                width: 1.5em;
                height: 1.5em;
                line-height: 1.6em;
                border-radius: 4px;
                border-bottom-width: 2px;
                font-size: 0.7em;
                margin-right: 0.5em;
            }

            button {
                background: transparent;
                color: inherit;
                font-family: inherit;
                font-size: inherit;
                font-weight: inherit;
                border: none;
                margin: 0;
                padding: 6px;
                cursor: pointer;
                text-align: center;
                outline: none;
                border-radius: var(--border-radius);
                display: flex;
                align-items: center;
            }

            button:not(:last-child) {
                margin-right: 4px;
            }

            button:hover:not([active]) {
                background: #eee;
            }

            button[active] {
                background: var(--color-primary);
                color: var(--color-tertiary);
            }

            button.close {
                padding: 0;
                font-size: 0.9em;
                border-radius: 100%;
                width: 2em;
                height: 2em;
                line-height: 2em;
                display: block;
            }

            button.close::before {
                font-family: "FontAwesome";
                content: "\\f00d";
            }
        `
    ];

    constructor() {
        super();
        document.addEventListener("focusin", () => this._fillSelected());
        document.addEventListener("keydown", (e: KeyboardEvent) => this._keydown(e));
        this._fillSelected();
    }

    async open(item: VaultItem, index = 0) {
        this.item = item;
        this._fieldIndex = index;
        await this.updateComplete;
        this.classList.add("showing");
        // this._fillNext();
    }

    close() {
        this.classList.remove("showing");
        setTimeout(() => (this.item = null), 500);
    }

    private _getActiveElement(doc: DocumentOrShadowRoot): Element | null {
        const el = doc.activeElement;
        return (el && el.shadowRoot && this._getActiveElement(el.shadowRoot)) || el;
    }

    private _isElementFillable(el: Element) {
        return (
            el instanceof HTMLInputElement &&
            ["text", "number", "email", "password", "tel", "date", "month", "search", "url"].includes(el.type)
        );
    }

    private _getActiveInput(): HTMLInputElement | null {
        const el = this._getActiveElement(document);
        return el && this._isElementFillable(el) ? (el as HTMLInputElement) : null;
    }

    private async _fillSelected() {
        const input = this._getActiveInput();

        if (!this.item || input === this._lastFilledInput) {
            return;
        }

        const filled = await this._fillIndex(this._fieldIndex);

        if (filled) {
            this._lastFilledInput = input;
            this._fieldIndex = (this._fieldIndex + 1) % this.item.fields.length;
        }
    }

    private async _fillIndex(index: number) {
        const field = this.item && this.item.fields[index];
        const input = this._getActiveInput();

        if (!field || !input) {
            return false;
        }

        // const value = field.type === "totp" ? await totp(base32ToBytes(field.value)) : field.value;
        const value =
            field.type === "totp"
                ? await browser.runtime.sendMessage({ type: "calcTOTP", secret: field.value })
                : field.value;

        input.value = value;
        input.dispatchEvent(
            new KeyboardEvent("keydown", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(
            new KeyboardEvent("keyup", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(
            new KeyboardEvent("keypress", {
                bubbles: true,
                key: ""
            })
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        // setTimeout(() => input.blur(), 100);
        // input.select();
        // document.execCommand("paste");
        const button = this.$(`.fields > :nth-child(${index + 1})`);
        button && this._ripple(button);
        this._ripple(input);
        // setTimeout(() => this._ripple(input), 100);
        // setTimeout(() => this._ripple(input), 200);
        // this._fieldIndex = Math.min(this.item!.fields.length - 1, this._fieldIndex + 1);
        return true;
    }

    private _ripple(el: HTMLElement) {
        const { left, top, width, height } = el.getBoundingClientRect();
        const ripple = document.createElement("div");
        // const ripple = input.cloneNode(true) as HTMLElement;
        Object.assign(ripple.style, {
            left: left + "px",
            top: top + "px",
            width: width + "px",
            height: height + "px"
        });
        ripple.classList.add("ripple");
        document.body.appendChild(ripple);
        setTimeout(() => document.body.removeChild(ripple), 500);
    }

    private _keydown({ code, ctrlKey, metaKey, altKey }: KeyboardEvent) {
        if (code === "Escape") {
            this.close();
        }
        if (!this.item) {
            return;
        }

        const matchNumber = code.match(/Digit(\d)/);
        const index = (matchNumber && parseInt(matchNumber[1])) || NaN;
        if (!isNaN(index) && !!this.item.fields[index - 1]) {
            const input = this._getActiveInput();
            if ((ctrlKey || metaKey) && altKey && input) {
                this._fillIndex(index - 1);
            } else if (!input) {
                this._fieldIndex = index - 1;
            }
        }
    }

    // private _move(e: MouseEvent) {
    //     console.log("move", e);
    // }
    //
    // private _mousedown() {
    //     this.style.cursor = "grabbing";
    //     const handler = (e: MouseEvent) => this._move(e);
    //     document.addEventListener("mousemove", handler);
    //     document.addEventListener(
    //         "mouseup",
    //         () => {
    //             this.style.cursor = "";
    //             document.removeEventListener("mousemove", handler);
    //         },
    //         { once: true }
    //     );
    // }

    render() {
        if (!this.item) {
            return html``;
        }

        return html`
            <div class="inner">
                <div class="header">
                    <div class="title">
                        ${this.item.name}
                    </div>
                    <button class="close" @click=${this.close}></button>
                </div>
                <div class="hint">Click the desired form input to fill!</div>
                <div class="fields">
                    ${this.item.fields.map(
                        (field, index) => html`
                            <button
                                class="field"
                                ?active=${index === this._fieldIndex}
                                @click=${() => (this._fieldIndex = index)}
                            >
                                <div class="field-index">
                                    ${index + 1}
                                </div>
                                <div class="field-name">
                                    ${field.name}
                                </div>
                            </button>
                        `
                    )}
                </div>
            </div>
        `;
    }
}
