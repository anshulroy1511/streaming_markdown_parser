const blogpostMarkdown = `# control

*humans should focus on bigger problems*

## Setup

\`\`\`bash
git clone git@github.com:anysphere/control
\`\`\`

\`\`\`bash
./init.sh
\`\`\`

## Folder structure

**The most important folders are:**

1. \`vscode\`: this is our fork of vscode, as a submodule.
2. \`milvus\`: this is where our Rust server code lives.
3. \`schema\`: this is our Protobuf definitions for communication between the client and the server.

Each of the above folders should contain fairly comprehensive README files; please read them. If something is missing, or not working, please add it to the README!

Some less important folders:

1. \`release\`: this is a collection of scripts and guides for releasing various things.
2. \`infra\`: infrastructure definitions for the on-prem deployment.
3. \`third_party\`: where we keep our vendored third party dependencies.

## Miscellaneous things that may or may not be useful

##### Where to find rust-proto definitions

They are in a file called \`aiserver.v1.rs\`. It might not be clear where that file is. Run \`rg --files --no-ignore bazel-out | rg aiserver.v1.rs\` to find the file.

## Releasing

Within \`vscode/\`:

- Bump the version
- Then:

\`\`\`
git checkout build-todesktop
git merge main
git push origin build-todesktop
\`\`\`

- Wait for 14 minutes for gulp and ~30 minutes for todesktop
- Go to todesktop.com, test the build locally and hit release
`;

let currentContainer: HTMLElement | null = null; 
// current parsing mode (normal text / inline code / code block)
let mode: 'text' | 'inline-code' | 'code-block' = 'text';
let pendingBackticks = 0;
let activeElement: HTMLElement | null = null;  // reference to current HTML element where text is being appended

let isLineStart = true;

let pendingStars = 0;

// Do not edit this method
function runStream() {
    currentContainer = document.getElementById('markdownContainer')!;

    // this randomly split the markdown into tokens between 2 and 20 characters long
    // simulates the behavior of an ml model thats giving you weirdly chunked tokens
    const tokens: string[] = [];
    let remainingMarkdown = blogpostMarkdown;
    while (remainingMarkdown.length > 0) {
        const tokenLength = Math.floor(Math.random() * 18) + 2;
        const token = remainingMarkdown.slice(0, tokenLength);
        tokens.push(token);
        remainingMarkdown = remainingMarkdown.slice(tokenLength);
    }

    const toCancel = setInterval(() => {
        const token = tokens.shift();
        if (token) {
            addToken(token);
        } else {
            clearInterval(toCancel);
        }
    }, 20);
}


/* 
Please edit the addToken method to support at least inline codeblocks and codeblocks. Feel free to add any other methods you need.
This starter code does token streaming with no styling right now. Your job is to write the parsing logic to make the styling work.

Note: don't be afraid of using globals for state. For this challenge, speed is preferred over cleanliness.
 */


// creates a span for normal text
function createTextSpan() {
    const span = document.createElement('span');
    currentContainer!.appendChild(span);
    activeElement = span;
}

// creates an inline <code> element
function createInlineCode() {
    const code = document.createElement('code');

    // minimal styling (assignment says styling not important)
    code.style.backgroundColor = '#eee';
    code.style.padding = '2px 4px';
    code.style.borderRadius = '4px';
    code.style.fontFamily = 'monospace';

    currentContainer!.appendChild(code);
    activeElement = code;
}

// creates a block-level code container (<pre><code>)
function createCodeBlock() {
    const pre = document.createElement('pre');
    const code = document.createElement('code');

    // minimal styling
    pre.style.backgroundColor = '#eee';
    pre.style.padding = '8px';
    pre.style.borderRadius = '6px';
    pre.style.fontFamily = 'monospace';
    pre.style.whiteSpace = 'pre-wrap';

    pre.appendChild(code);
    currentContainer!.appendChild(pre);

    activeElement = code;
}

// creates an italic text element
function createItalic() {
    const em = document.createElement('em');
    currentContainer!.appendChild(em);
    activeElement = em;
}

// creates a bold text element
function createBold() {
    const strong = document.createElement('strong');
    currentContainer!.appendChild(strong);
    activeElement = strong;
}

// creates a heading element based on heading level
function createHeading(level: number) {
    const heading = document.createElement(`h${level}`);
    currentContainer!.appendChild(heading);
    activeElement = heading;
}


let currentList: HTMLUListElement | null = null;

// creates a new list item
function createListItem() {
    if (!currentList) {
        currentList = document.createElement('ul');
        currentContainer!.appendChild(currentList);
    }

    const li = document.createElement('li');
    currentList.appendChild(li);
    activeElement = li;
}

// resets line-based structures when needed
function resetLineStructures() {
    if (mode === 'text') {
        currentList = null;
    }
}

// appends text to current active element
function appendText(text: string) {
    if (!text) return;

    // create normal text container if nothing is active
    if (!activeElement) {
        createTextSpan();
    }

    activeElement!.textContent += text;

    // track whether next character starts a new line
    if (text.includes('\n')) {
        isLineStart = true;
        activeElement = null;
        resetLineStructures();
    } else {
        isLineStart = false;
    }
}

// handles line-start markdown like headings and unordered lists
function handleLineStartMarker(token: string, index: number): number {
    // only check at the start of a line and only in normal text mode
    if (mode !== 'text' || !isLineStart) return index;

    // heading detection: #, ##, ### ... followed by a space
    if (token[index] === '#') {
        let count = 0;
        let j = index;

        while (j < token.length && token[j] === '#') {
            count++;
            j++;
        }

        if (j < token.length && token[j] === ' ') {
            createHeading(Math.min(count, 6));
            isLineStart = false;
            return j + 1; // skip heading markers and the space
        }
    }

    // unordered list detection: - item OR * item
    if (
        (token[index] === '-' || token[index] === '*') &&
        index + 1 < token.length &&
        token[index + 1] === ' '
    ) {
        createListItem();
        isLineStart = false;
        return index + 2; // skip marker and the space
    }

    return index;
}

// handles * and ** for italic and bold
function handleStars(count: number) {
    while (count > 0) {
        // double star => bold
        if (count >= 2) {
            if (activeElement?.tagName === 'STRONG') {
                activeElement = null;
            } else {
                createBold();
            }
            count -= 2;
        } else {
            // single star => italic
            if (activeElement?.tagName === 'EM') {
                activeElement = null;
            } else {
                createItalic();
            }
            count -= 1;
        }
    }
}

// handles completed backtick groups like ` or ```
function handleBackticks(count: number) {
    while (count > 0) {
        // triple backticks => code block
        if (count >= 3) {
            if (mode === 'text') {
                mode = 'code-block';
                createCodeBlock();
            } else if (mode === 'code-block') {
                mode = 'text';
                activeElement = null;
            } else {
                // if we are inside inline code, treat triple backticks as normal text
                appendText('```');
            }
            count -= 3;
        } else {
            // single backtick => inline code
            if (mode === 'text') {
                mode = 'inline-code';
                createInlineCode();
            } else if (mode === 'inline-code') {
                mode = 'text';
                activeElement = null;
            } else {
                // if we are inside code block, treat single backtick as normal text
                appendText('`');
            }
            count -= 1;
        }
    }
}

/// parses each streamed token character by character
function addToken(token: string) {
    if (!currentContainer) return;

    for (let i = 0; i < token.length; i++) {
        const ch = token[i];

        // handle headings / list markers only at line start
        const newIndex = handleLineStartMarker(token, i);
        if (newIndex !== i) {
            i = newIndex - 1;
            continue;
        }

        // count consecutive backticks
        if (ch === '`') {
            pendingBackticks++;
            continue;
        }

        // process pending backticks before handling normal characters
        if (pendingBackticks > 0) {
            handleBackticks(pendingBackticks);
            pendingBackticks = 0;
        }

        // only parse stars in normal text mode
        if (mode === 'text' && ch === '*') {
            pendingStars++;
            continue;
        }

        // process pending stars before appending normal text
        if (pendingStars > 0) {
            handleStars(pendingStars);
            pendingStars = 0;
        }

        appendText(ch);
    }
}