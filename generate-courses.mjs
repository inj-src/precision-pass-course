import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outRoot = path.join(root, "precision-pass-courses");
const baseTemplatePath = path.join(
  root,
  ".agents/skills/codebase-to-course/references/_base.html",
);

const accents = {
  teal: {
    color: "#2A7B9B",
    hover: "#1F6280",
    light: "#E4F2F7",
    muted: "#5A9DB8",
  },
  forest: {
    color: "#2D8B55",
    hover: "#226B41",
    light: "#E8F5EE",
    muted: "#5AAD7A",
  },
  coral: {
    color: "#E06B56",
    hover: "#C85A47",
    light: "#FDECEA",
    muted: "#E89585",
  },
  amber: {
    color: "#D4A843",
    hover: "#BF9530",
    light: "#FDF5E0",
    muted: "#E0C070",
  },
};

const H = String.raw;

function attr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function decodeHtml(value) {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#96;", "`")
    .replaceAll("&#36;", "$")
    .replaceAll("&amp;", "&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cleanCode(code) {
  return decodeHtml(code)
    .replace(/^\n+|\n+$/g, "")
    .replace(/<span class="code-line">/g, "")
    .replace(/<\/span>/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

function inferLanguage(code) {
  const text = cleanCode(code);
  if (
    /(^|\n)\s*(def |class .*BaseModel|@app\.|@asynccontextmanager|for .* in |if .*:|return \{)/.test(
      text,
    )
  ) {
    return "python";
  }
  if (text.includes("<") && text.includes(">") && /className=|<Badge|<Sidebar/.test(text)) {
    return "tsx";
  }
  return "typescript";
}

function navDots(modules) {
  return modules
    .map(
      (mod, index) =>
        `<button class="nav-dot" data-target="module-${index + 1}" data-tooltip="${attr(
          mod.nav,
        )}" role="tab" aria-label="Module ${index + 1}: ${attr(mod.nav)}"></button>`,
    )
    .join("\n        ");
}

function moduleSection(number, title, subtitle, body) {
  return H`<section class="module" id="module-${number}">
  <div class="module-content">
    <header class="module-header animate-in">
      <span class="module-number">${String(number).padStart(2, "0")}</span>
      <h1 class="module-title">${title}</h1>
      <p class="module-subtitle">${subtitle}</p>
    </header>
${body}
  </div>
</section>
`;
}

function quiz(id, questions) {
  return H`<div class="quiz-container animate-in" id="${id}">
${questions
  .map(
    (q) => H`  <div class="quiz-question-block"
       data-correct="${attr(q.correct)}"
       data-explanation-right="${attr(q.right)}"
       data-explanation-wrong="${attr(q.wrong)}">
    <h3 class="quiz-question">${q.question}</h3>
    <div class="quiz-options">
${q.options
  .map(
    (option) => H`      <button class="quiz-option" data-value="${attr(
      option.value,
    )}" onclick="selectOption(this)">
        <div class="quiz-option-radio"></div>
        <span>${option.label}</span>
      </button>`,
  )
  .join("\n")}
    </div>
    <div class="quiz-feedback"></div>
  </div>`,
  )
  .join("\n\n")}
  <button class="quiz-check-btn" onclick="checkQuiz('${id}')">Check Answers</button>
  <button class="quiz-reset-btn" onclick="resetQuiz('${id}')">Try Again</button>
</div>`;
}

function flowAnimation(actors, steps, intro = "Click Next Step to walk through the path") {
  const safeSteps = JSON.stringify(steps).replaceAll("'", "&#39;");
  return H`<div class="flow-animation animate-in" data-steps='${safeSteps}'>
  <div class="flow-actors">
${actors
  .map(
    (actor, index) => H`    <div class="flow-actor" id="flow-actor-${index + 1}">
      <div class="flow-actor-icon">${actor.icon}</div>
      <span>${actor.label}</span>
    </div>`,
  )
  .join("\n")}
  </div>
  <div class="flow-packet" id="flow-packet"></div>
  <div class="flow-step-label" id="flow-label">${intro}</div>
  <div class="flow-controls">
    <button class="btn flow-next-btn">Next Step</button>
    <button class="btn flow-reset-btn">Restart</button>
    <span class="flow-progress"></span>
  </div>
</div>`;
}

function chatWindow(id, messages) {
  return H`<div class="chat-window animate-in" id="${id}">
  <div class="chat-messages">
${messages
  .map(
    (msg, index) => H`    <div class="chat-message" data-msg="${index}" data-sender="${attr(
      msg.sender,
    )}" style="display:none">
      <div class="chat-avatar" style="background: ${msg.color}">${msg.avatar}</div>
      <div class="chat-bubble">
        <span class="chat-sender" style="color: ${msg.color}">${msg.sender}</span>
        <p>${msg.text}</p>
      </div>
    </div>`,
  )
  .join("\n")}
  </div>
  <div class="chat-typing" id="${id}-typing" style="display:none">
    <div class="chat-avatar" id="${id}-typing-avatar">?</div>
    <div class="chat-typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  </div>
  <div class="chat-controls">
    <button class="btn chat-next-btn">Next Message</button>
    <button class="btn chat-all-btn">Play All</button>
    <button class="btn chat-reset-btn">Replay</button>
    <span class="chat-progress"></span>
  </div>
</div>`;
}

function codeBlock(code, english, language = inferLanguage(code)) {
  const cleanedCode = cleanCode(code);
  return H`<div class="translation-block animate-in">
  <div class="translation-code">
    <span class="translation-label">CODE</span>
    <pre><code class="language-${language}">${escapeHtml(cleanedCode)}</code></pre>
  </div>
  <div class="translation-english">
    <span class="translation-label">PLAIN ENGLISH</span>
    <div class="translation-lines">
${english.map((line) => `      <p class="tl">${line}</p>`).join("\n")}
    </div>
  </div>
</div>`;
}

const faceModules = [
  {
    nav: "Face Pipeline",
    file: "01-face-pipeline.html",
    html: moduleSection(
      1,
      "The Face Pipeline",
      "A browser camera frame becomes a face box, a name, and sometimes an attendance record.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Start with the user action</h2>
      <p>Imagine the live monitor as a checkpoint camera. The <span class="term" data-definition="The frontend is the part of the app that runs in the browser and shows screens, buttons, video, and tables to the user.">frontend</span> captures one still image, sends it to the <span class="term" data-definition="The backend is the server-side part of the app that receives requests, runs business logic, and stores data.">backend</span>, and waits for a result.</p>
      <p>The key route is <code>POST /recognition/frame</code>. The main files are <code>app/live-monitor/page.tsx:116-144</code>, <code>lib/video-frame.ts:1-35</code>, <code>lib/cv-api.ts:215-222</code>, and <code>CV/vision.py:117-205</code>.</p>
      ${flowAnimation(
        [
          { icon: "UI", label: "Live monitor" },
          { icon: "JPG", label: "Frame blob" },
          { icon: "API", label: "FastAPI route" },
          { icon: "CV", label: "OpenCV + KNN" },
          { icon: "ATT", label: "Attendance JSON" },
        ],
        [
          { highlight: "flow-actor-1", label: "The live monitor waits for the camera to be ready." },
          { highlight: "flow-actor-2", label: "The browser draws the video into a canvas and turns it into JPEG bytes.", packet: true, from: "actor-1", to: "actor-2" },
          { highlight: "flow-actor-3", label: "The JPEG is posted to the recognition endpoint.", packet: true, from: "actor-2", to: "actor-3" },
          { highlight: "flow-actor-4", label: "The CV layer finds faces and compares them to enrolled samples.", packet: true, from: "actor-3", to: "actor-4" },
          { highlight: "flow-actor-5", label: "If it is a first match for the day, attendance is written.", packet: true, from: "actor-4", to: "actor-5" },
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The browser sends one picture at a time</h2>
      <p>The loop is deliberately small. It sends a frame every 500 milliseconds, but uses a <span class="term" data-definition="A ref is a React object that can hold a value without forcing the screen to rerender. Here it remembers whether recognition is already running.">ref</span> to avoid overlapping requests.</p>
      ${codeBlock(
        H`<span class="code-line">const interval = window.setInterval(async () =&gt; {</span>
<span class="code-line">  if (analysisInFlightRef.current || !videoRef.current || document.hidden) {</span>
<span class="code-line">    return;</span>
<span class="code-line">  }</span>
<span class="code-line">  analysisInFlightRef.current = true;</span>
<span class="code-line">  setAnalyzing(true);</span>`,
        [
          "<code>setInterval</code> creates the repeating heartbeat for live recognition.",
          "If another request is still running, if video is missing, or if the tab is hidden, the function exits.",
          "That prevents a pileup of slow recognition requests.",
          "The page marks analysis as active so the UI can show activity.",
          "File reference: <code>app/live-monitor/page.tsx:116-123</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">AI</div>
        <div class="callout-content">
          <strong class="callout-title">Steering tip</strong>
          <p>If you ask an AI assistant to make recognition faster, mention this exact loop. The safe target is interval timing, image size, or backend speed, not launching many parallel requests.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Checkpoint conversation</h2>
      <p>This is the mental model you should keep when explaining the feature to someone else.</p>
      ${chatWindow("chat-face-pipeline", [
        { sender: "Live Monitor", avatar: "UI", color: "var(--color-actor-1)", text: "I have camera access. Every half second I can capture a still frame." },
        { sender: "Video Helper", avatar: "JPG", color: "var(--color-actor-2)", text: "I will draw the video frame to a canvas and compress it as JPEG." },
        { sender: "API Client", avatar: "API", color: "var(--color-actor-3)", text: "I will wrap that JPEG in FormData and post it to /recognition/frame." },
        { sender: "Vision Layer", avatar: "CV", color: "var(--color-actor-4)", text: "I will find faces, compare them with samples, and return boxes and names." },
        { sender: "Dashboard", avatar: "ATT", color: "var(--color-actor-5)", text: "If a first check-in was recorded, I can show the employee as present or late." },
      ])}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-face-1", [
        {
          question: "The live monitor starts showing duplicated recognition events. Where should you inspect first?",
          correct: "a",
          right: "Exactly. Start where repeated frames are scheduled and where in-flight requests are guarded.",
          wrong: "Not quite. The symptom begins before the backend writes events: the browser might be sending too many frames.",
          options: [
            { value: "a", label: "<code>app/live-monitor/page.tsx</code>, especially the 500 ms interval and <code>analysisInFlightRef</code>." },
            { value: "b", label: "<code>app/payroll/page.tsx</code>, because payroll totals are later affected." },
            { value: "c", label: "<code>CV/data/leaves.json</code>, because leave data changes attendance." },
          ],
        },
        {
          question: "A user asks why recognition pauses when the tab is hidden. What is the best explanation?",
          correct: "b",
          right: "Correct. The code explicitly checks <code>document.hidden</code> before sending a frame.",
          wrong: "Look for the browser-side guard. It is not a backend failure.",
          options: [
            { value: "a", label: "FastAPI rejects hidden tabs automatically." },
            { value: "b", label: "The frontend skips capture while <code>document.hidden</code> is true." },
            { value: "c", label: "OpenCV cannot decode images from a hidden camera." },
          ],
        },
        {
          question: "If you want more accurate recognition but slower uploads, which setting would you consider?",
          correct: "c",
          right: "Yes. Larger or higher-quality JPEGs preserve more face detail but cost more network and CPU time.",
          wrong: "The tradeoff is in the frame capture options, not the sidebar or payroll UI.",
          options: [
            { value: "a", label: "Change the sidebar route order." },
            { value: "b", label: "Reduce payroll month length." },
            { value: "c", label: "Increase <code>maxWidth</code> or <code>quality</code> in <code>captureVideoFrame</code> calls." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Enrollment",
    file: "02-enrollment.html",
    html: moduleSection(
      2,
      "Enrollment: Teaching The System A Face",
      "Before recognition can work, the project must collect clean face crops for each employee.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Enrollment is the ID photo session</h2>
      <p>The face registry page first creates an employee, then captures 18 camera frames. The backend accepts only frames with exactly one detected face.</p>
      <div class="flow-steps animate-in">
        <div class="flow-step"><div class="flow-step-num">1</div><p>Create employee record</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">2</div><p>Capture 18 JPEG frames</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">3</div><p>Upload as <span class="term" data-definition="FormData is a browser object for sending files and fields in one request, like a filled form with attachments.">FormData</span></p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">4</div><p>Save accepted face crops</p></div>
      </div>
      <p>File references: <code>app/face-registration/page.tsx:165-180</code>, <code>lib/cv-api.ts:200-212</code>, <code>CV/server.py:253-263</code>, <code>CV/vision.py:81-114</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">The frontend creates the sample batch</h2>
      ${codeBlock(
        H`<span class="code-line">const frames: Blob[] = [];</span>
<span class="code-line"></span>
<span class="code-line">for (let index = 0; index &lt; 18; index += 1) {</span>
<span class="code-line">  frames.push(await captureVideoFrame(videoRef.current, { maxWidth: 720, quality: 0.85 }));</span>
<span class="code-line">  await new Promise((resolve) =&gt; window.setTimeout(resolve, 140));</span>
<span class="code-line">}</span>
<span class="code-line"></span>
<span class="code-line">const result = await enrollEmployee(employee.id, frames);</span>`,
        [
          "Start with an empty list of image files.",
          "Repeat exactly 18 times so one enrollment has many examples.",
          "Capture the current video frame as a JPEG blob.",
          "Wait 140 milliseconds so the samples are not all identical.",
          "Send the full batch to the backend for the selected employee.",
          "File reference: <code>app/face-registration/page.tsx:173-180</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The backend rejects messy samples</h2>
      ${codeBlock(
        H`<span class="code-line">faces = detect_faces(state, frame)</span>
<span class="code-line">if len(faces) != 1:</span>
<span class="code-line">    reason = &quot;no face detected&quot; if len(faces) == 0 else &quot;multiple faces detected&quot;</span>
<span class="code-line">    rejected_reasons.append(f&quot;Frame {index + 1}: {reason}&quot;)</span>
<span class="code-line">    continue</span>
<span class="code-line"></span>
<span class="code-line">x, y, width, height = faces[0]</span>
<span class="code-line">crop = frame[y : y + height, x : x + width]</span>`,
        [
          "Run face detection on each uploaded frame.",
          "If the frame does not contain exactly one face, do not train from it.",
          "Save a human-readable reason so the UI can explain what happened.",
          "For a clean frame, take the detected rectangle.",
          "Crop just the face area and save that as a sample.",
          "File reference: <code>CV/vision.py:92-100</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">CS</div>
        <div class="callout-content">
          <strong class="callout-title">Key insight</strong>
          <p>Training data quality matters more than training data quantity. Bad examples teach the model bad habits.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-face-2", [
        {
          question: "Enrollment accepts only 3 of 18 frames. What should you check first?",
          correct: "b",
          right: "Correct. The backend already records rejected reasons such as no face or multiple faces.",
          wrong: "The useful clue is the backend rejection reason returned to the frontend.",
          options: [
            { value: "a", label: "Payroll totals, because rejected samples affect salary." },
            { value: "b", label: "The <code>rejectedReasons</code> returned by <code>CV/vision.py</code>." },
            { value: "c", label: "The Next.js root layout metadata." },
          ],
        },
        {
          question: "Why does the browser wait 140 ms between samples?",
          correct: "a",
          right: "Exactly. Small changes in head pose and lighting make the saved examples more useful.",
          wrong: "The wait is about sample variety, not avoiding a server route.",
          options: [
            { value: "a", label: "To capture slightly different frames instead of 18 near-duplicates." },
            { value: "b", label: "To let payroll calculate the month." },
            { value: "c", label: "To avoid CORS checks." },
          ],
        },
        {
          question: "If you add a retake feature, which two areas must stay in sync?",
          correct: "c",
          right: "Yes. You must update both stored face files and employee sample metadata.",
          wrong: "Retake affects face sample storage and employee state, not only the button label.",
          options: [
            { value: "a", label: "Only the button text in the registration page." },
            { value: "b", label: "Only the sidebar route list." },
            { value: "c", label: "The files under <code>CV/data/face_samples/&lt;id&gt;</code> and the employee <code>sampleCount</code>." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Face Detection",
    file: "03-face-detection.html",
    html: moduleSection(
      3,
      "Finding A Face Rectangle",
      "OpenCV does not know names yet. First it searches the image for face-shaped regions.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Detection is the inspection station</h2>
      <p>The project uses a Haar cascade file, <code>CV/haar_face.xml</code>, as a prebuilt face detector. A <span class="term" data-definition="A classifier is code or data that decides which category something belongs to, such as face versus not-face.">classifier</span> scans the grayscale image and returns rectangles.</p>
      <div class="file-tree animate-in">
        <div class="ft-folder"><span class="ft-name">CV</span><span class="ft-desc">Computer vision backend package</span>
          <div class="ft-children">
            <div class="ft-file"><span class="ft-name">haar_face.xml</span><span class="ft-desc">Pretrained frontal face detector</span></div>
            <div class="ft-file"><span class="ft-name">vision.py</span><span class="ft-desc">Loads the detector and calls detectMultiScale</span></div>
          </div>
        </div>
      </div>
      <p>File references: <code>CV/vision.py:35-50</code> and <code>CV/vision.py:218-227</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">The detector is loaded once</h2>
      ${codeBlock(
        H`<span class="code-line">def create_vision_state() -&gt; VisionState:</span>
<span class="code-line">    cascade_path = Path(__file__).resolve().parent / &quot;haar_face.xml&quot;</span>
<span class="code-line">    face_cascade = cv2.CascadeClassifier(str(cascade_path))</span>
<span class="code-line">    if face_cascade.empty():</span>
<span class="code-line">        raise RuntimeError(f&quot;Failed to load Haar cascade from {cascade_path}&quot;)</span>`,
        [
          "Build the path to the XML detector next to <code>vision.py</code>.",
          "Ask OpenCV to load that detector into memory.",
          "Fail early if the XML file is missing or invalid.",
          "This runs during backend startup, before users upload frames.",
          "File reference: <code>CV/vision.py:35-39</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The face box is normalized for the frontend</h2>
      ${codeBlock(
        H`<span class="code-line">def detect_faces(state: VisionState, frame: np.ndarray) -&gt; list[tuple[int, int, int, int]]:</span>
<span class="code-line">    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)</span>
<span class="code-line">    faces = state.face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5)</span>
<span class="code-line">    return [(int(x), int(y), int(width), int(height)) for (x, y, width, height) in faces]</span>`,
        [
          "Accept one decoded image frame.",
          "Convert it to grayscale because the detector works on light/dark patterns.",
          "Scan for face-like rectangles using OpenCV.",
          "Return plain integer boxes: x, y, width, height.",
          "File reference: <code>CV/vision.py:218-221</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">UI</div>
        <div class="callout-content">
          <strong class="callout-title">Why ratios matter</strong>
          <p>The backend later converts pixel boxes into percentages. That lets <code>CameraFeed</code> draw overlays correctly even when the video is resized in the browser.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-face-3", [
        {
          question: "The backend starts failing with a message about the Haar cascade. Which file is the likely missing dependency?",
          correct: "b",
          right: "Correct. <code>create_vision_state</code> loads <code>CV/haar_face.xml</code> at startup.",
          wrong: "The face detector is an XML file loaded by OpenCV, not a React component.",
          options: [
            { value: "a", label: "<code>components/ui/button.tsx</code>" },
            { value: "b", label: "<code>CV/haar_face.xml</code>" },
            { value: "c", label: "<code>CV/data/leaves.json</code>" },
          ],
        },
        {
          question: "A face is detected but the box appears in the wrong place on screen. Which concept should you inspect?",
          correct: "a",
          right: "Exactly. The backend returns ratios and the frontend multiplies them into CSS percentages.",
          wrong: "This is most likely a coordinate conversion or overlay issue.",
          options: [
            { value: "a", label: "Pixel-to-ratio conversion and overlay CSS in <code>CameraFeed</code>." },
            { value: "b", label: "The monthly payroll query." },
            { value: "c", label: "The employee delete confirmation." },
          ],
        },
        {
          question: "Why convert the frame to grayscale before detection?",
          correct: "c",
          right: "Yes. The detector is looking for contrast patterns, so color is unnecessary.",
          wrong: "Grayscale is used because the chosen detector works on light and dark pattern features.",
          options: [
            { value: "a", label: "Because JPEG files cannot store color." },
            { value: "b", label: "Because FastAPI only accepts black and white uploads." },
            { value: "c", label: "Because the Haar cascade scans light and dark patterns, not identity colors." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Recognition Model",
    file: "04-recognition-model.html",
    html: moduleSection(
      4,
      "Recognition: Comparing A Face To Samples",
      "After a rectangle is found, the model asks which enrolled employee looks nearest.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Recognition is a closest-match lookup</h2>
      <p>The model is a <span class="term" data-definition="KNN means K-nearest neighbors. It predicts a label by finding the most similar saved examples.">KNN</span> classifier from scikit-learn. Each saved face crop becomes a flat list of numbers, and each list is labeled with the employee ID.</p>
      <div class="pattern-cards animate-in">
        <div class="pattern-card" style="border-top-color: var(--color-actor-1)"><div class="pattern-icon" style="background: var(--color-actor-1)">50</div><h4 class="pattern-title">Resize</h4><p class="pattern-desc">Every face becomes 50 by 50 pixels so all samples have the same shape.</p></div>
        <div class="pattern-card" style="border-top-color: var(--color-actor-2)"><div class="pattern-icon" style="background: var(--color-actor-2)">1D</div><h4 class="pattern-title">Flatten</h4><p class="pattern-desc">The image grid becomes one long numeric fingerprint.</p></div>
        <div class="pattern-card" style="border-top-color: var(--color-actor-3)"><div class="pattern-icon" style="background: var(--color-actor-3)">ID</div><h4 class="pattern-title">Label</h4><p class="pattern-desc">The fingerprint is stored with the employee ID as its answer key.</p></div>
      </div>
      <p>File references: <code>CV/vision.py:58-79</code>, <code>CV/vision.py:224-227</code>, and <code>CV/vision.py:148-171</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Training reads all saved samples</h2>
      ${codeBlock(
        H`<span class="code-line">for employee in data.list_employees():</span>
<span class="code-line">    sample_dir = data.face_samples_dir(employee[&quot;id&quot;])</span>
<span class="code-line">    for sample_path in sorted(sample_dir.glob(&quot;*.jpg&quot;)):</span>
<span class="code-line">        image = cv2.imread(str(sample_path))</span>
<span class="code-line">        if image is None:</span>
<span class="code-line">            continue</span>
<span class="code-line">        samples.append(preprocess_face(image))</span>
<span class="code-line">        labels.append(str(employee[&quot;id&quot;]))</span>`,
        [
          "Loop over every employee record.",
          "Open that employee's face sample folder.",
          "Read each JPEG face crop from disk.",
          "Skip unreadable images instead of crashing training.",
          "Convert the image into the numeric shape the model expects.",
          "Store the employee ID as the label for that sample.",
          "File reference: <code>CV/vision.py:62-69</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Unknown is a deliberate result</h2>
      ${codeBlock(
        H`<span class="code-line">distances, _ = model.kneighbors(sample, n_neighbors=1)</span>
<span class="code-line">distance = float(distances[0][0])</span>
<span class="code-line">predicted_employee_id = str(model.predict(sample)[0])</span>
<span class="code-line"></span>
<span class="code-line">if (</span>
<span class="code-line">    predicted_employee_id not in employees_by_code</span>
<span class="code-line">    or distance &gt; state.unknown_distance_threshold</span>
<span class="code-line">):</span>`,
        [
          "Ask the KNN model for the nearest saved face sample.",
          "Read how far away that nearest sample is.",
          "Ask the model which employee ID it predicts.",
          "Reject the prediction if the employee no longer exists.",
          "Also reject it if the distance is too large.",
          "That threshold is what turns a weak guess into <code>unknown</code>.",
          "File reference: <code>CV/vision.py:150-157</code>.",
        ],
      )}
      <div class="callout callout-warning">
        <div class="callout-icon">DBG</div>
        <div class="callout-content">
          <strong class="callout-title">Debugging smell</strong>
          <p>If everyone is unknown, inspect sample quality and <code>CV_UNKNOWN_DISTANCE_THRESHOLD</code>. If everyone matches the wrong person, inspect training folders and employee IDs.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-face-4", [
        {
          question: "After deleting an employee, why must the model retrain?",
          correct: "a",
          right: "Correct. The model may still have learned samples for the deleted employee until it is rebuilt.",
          wrong: "The retrain is about removing old learned examples from the active model.",
          options: [
            { value: "a", label: "Because the KNN model keeps learned samples in memory." },
            { value: "b", label: "Because the sidebar route cache must refresh." },
            { value: "c", label: "Because payroll month names are generated at startup." },
          ],
        },
        {
          question: "Recognition is too strict and labels real employees as unknown. Which setting is most relevant?",
          correct: "b",
          right: "Yes. The unknown distance threshold controls how far a nearest sample can be before rejecting the match.",
          wrong: "The relevant setting is the distance threshold inside the vision state.",
          options: [
            { value: "a", label: "<code>NEXT_PUBLIC_CV_API_BASE_URL</code>" },
            { value: "b", label: "<code>CV_UNKNOWN_DISTANCE_THRESHOLD</code>" },
            { value: "c", label: "<code>CV_ALLOWED_ORIGINS</code>" },
          ],
        },
        {
          question: "Why are faces resized to one fixed size before training?",
          correct: "c",
          right: "Exactly. Machine learning input arrays need consistent shape.",
          wrong: "The key reason is that every sample must have the same number of values.",
          options: [
            { value: "a", label: "So React can draw a rounded rectangle." },
            { value: "b", label: "So JSON files are sorted alphabetically." },
            { value: "c", label: "So every saved face becomes the same-length numeric vector." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Attendance Result",
    file: "05-attendance-result.html",
    html: moduleSection(
      5,
      "From Match To Attendance",
      "The final face-detection result becomes operational data: present, late, seen, or unknown.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">A match can create a daily check-in</h2>
      <p>Recognition is not just a label on screen. If the match is valid and no attendance exists for that employee today, the backend writes a record to <code>CV/data/attendance.json</code>.</p>
      <div class="badge-list animate-in">
        <div class="badge-item"><code class="badge-code">present</code><span class="badge-desc">Detected at or before scheduled check-in.</span></div>
        <div class="badge-item"><code class="badge-code">late</code><span class="badge-desc">Detected after scheduled check-in.</span></div>
        <div class="badge-item"><code class="badge-code">seen</code><span class="badge-desc">Recognized again, but attendance was already recorded today.</span></div>
        <div class="badge-item"><code class="badge-code">unknown</code><span class="badge-desc">A face was found, but no confident employee match was accepted.</span></div>
      </div>
      <p>File references: <code>CV/vision.py:172-200</code>, <code>CV/data.py:258-286</code>, <code>components/live-monitor/recognition-feed.tsx:41-107</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">First check-in wins</h2>
      ${codeBlock(
        H`<span class="code-line">already_recorded = any(</span>
<span class="code-line">    record[&quot;id&quot;] == employee[&quot;id&quot;] and record[&quot;date&quot;] == target_date</span>
<span class="code-line">    for record in attendance_records</span>
<span class="code-line">)</span>
<span class="code-line">if already_recorded:</span>
<span class="code-line">    return None</span>`,
        [
          "Look through existing attendance rows.",
          "Find any row with the same employee ID and the same date.",
          "If one exists, stop and return nothing.",
          "This prevents duplicate check-ins for one person on one day.",
          "File reference: <code>CV/data.py:267-273</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The UI shows both detection and business meaning</h2>
      ${codeBlock(
        H`<span class="code-line">&lt;Badge variant={recognition.attendanceStatus === &quot;late&quot; ? &quot;destructive&quot; : &quot;secondary&quot;}&gt;</span>
<span class="code-line">  {recognition.attendanceRecorded ? recognition.attendanceStatus : &quot;seen&quot;}</span>
<span class="code-line">&lt;/Badge&gt;</span>`,
        [
          "Choose a stronger badge style when the recognition is late.",
          "If the backend created attendance now, show present or late.",
          "If the employee was already recorded today, show seen instead.",
          "File reference: <code>components/live-monitor/recognition-feed.tsx:103-106</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">OPS</div>
        <div class="callout-content">
          <strong class="callout-title">Business rule boundary</strong>
          <p>The backend owns whether attendance is recorded. The frontend only displays the decision. That is why refreshing the UI does not create duplicate attendance.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-face-5", [
        {
          question: "A recognized employee shows as seen instead of present. What does that mean?",
          correct: "b",
          right: "Correct. The backend recognized them, but no new attendance row was created.",
          wrong: "Seen means recognition happened without creating a fresh attendance record.",
          options: [
            { value: "a", label: "The employee was unknown." },
            { value: "b", label: "The employee already had an attendance record for the day." },
            { value: "c", label: "The employee is missing from the sidebar." },
          ],
        },
        {
          question: "If attendance duplicates appear for the same employee and date, where is the business rule?",
          correct: "a",
          right: "Exactly. <code>record_attendance_if_first</code> is the duplicate-prevention function.",
          wrong: "The rule is in the data layer function that writes attendance, not only in visual components.",
          options: [
            { value: "a", label: "<code>CV/data.py:258-286</code>" },
            { value: "b", label: "<code>components/ui/badge.tsx</code>" },
            { value: "c", label: "<code>app/layout.tsx</code>" },
          ],
        },
        {
          question: "Why compute present versus late on the backend?",
          correct: "c",
          right: "Yes. It keeps the official attendance decision next to the write operation.",
          wrong: "The status is business data, so the backend is the correct source of truth.",
          options: [
            { value: "a", label: "Because React cannot compare times." },
            { value: "b", label: "Because CSS badges require Python." },
            { value: "c", label: "Because the server is the source of truth for attendance records." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
];

const serverModules = [
  {
    nav: "Server Shape",
    file: "01-server-shape.html",
    html: moduleSection(
      1,
      "The Server Shape",
      "The Python backend is a small FastAPI app that owns data, recognition, attendance, leave, and payroll.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Think of the server as the front desk ledger</h2>
      <p>The <span class="term" data-definition="A server is a program that waits for requests from clients, does work, and sends responses back.">server</span> receives requests from the browser, validates them, calls helper modules, and returns structured JSON.</p>
      <p>It starts with <code>python3 -m uvicorn CV.server:app --reload</code> from <code>package.json:7</code> or <code>CV/README.md:8-10</code>.</p>
      ${flowAnimation(
        [
          { icon: "REQ", label: "Browser request" },
          { icon: "API", label: "FastAPI route" },
          { icon: "P", label: "Pydantic model" },
          { icon: "DATA", label: "data.py" },
          { icon: "CV", label: "vision.py" },
        ],
        [
          { highlight: "flow-actor-1", label: "A page asks for employees, attendance, recognition, leave, or payroll." },
          { highlight: "flow-actor-2", label: "FastAPI matches the URL and HTTP method to a route.", packet: true, from: "actor-1", to: "actor-2" },
          { highlight: "flow-actor-3", label: "Pydantic validates request and response shapes.", packet: true, from: "actor-2", to: "actor-3" },
          { highlight: "flow-actor-4", label: "Data helpers read or write JSON files when records change.", packet: true, from: "actor-3", to: "actor-4" },
          { highlight: "flow-actor-5", label: "Vision helpers run face detection and recognition when images arrive.", packet: true, from: "actor-2", to: "actor-5" },
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Startup prepares storage and the model</h2>
      ${codeBlock(
        H`<span class="code-line">@asynccontextmanager</span>
<span class="code-line">async def lifespan(app: FastAPI):</span>
<span class="code-line">    data.ensure_data_files()</span>
<span class="code-line">    app.state.vision_state = vision.create_vision_state()</span>
<span class="code-line">    vision.retrain_model(app.state.vision_state)</span>
<span class="code-line">    yield</span>`,
        [
          "Register a startup-and-shutdown lifecycle function.",
          "Create JSON files and folders if they do not exist.",
          "Load the OpenCV face detector into shared app state.",
          "Train the recognition model from saved face samples.",
          "Keep the app running after setup completes.",
          "File reference: <code>CV/server.py:189-194</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Server actors talk like this</h2>
      ${chatWindow("chat-server-shape", [
        { sender: "FastAPI", avatar: "API", color: "var(--color-actor-1)", text: "I receive the URL, method, body, query params, and uploaded files." },
        { sender: "Pydantic", avatar: "P", color: "var(--color-actor-2)", text: "I check that incoming data matches the expected shape before route logic trusts it." },
        { sender: "Data Layer", avatar: "D", color: "var(--color-actor-3)", text: "I read and write employees, attendance, and leaves from JSON files." },
        { sender: "Vision Layer", avatar: "CV", color: "var(--color-actor-4)", text: "I manage detector state, training samples, recognition events, and model thresholds." },
        { sender: "Frontend", avatar: "UI", color: "var(--color-actor-5)", text: "I consume JSON responses and update screens." },
      ])}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-server-1", [
        {
          question: "The backend starts but recognition says modelReady is false. Which startup area should you inspect?",
          correct: "a",
          right: "Correct. Model readiness depends on saved samples and retraining during lifespan.",
          wrong: "Model readiness is prepared during backend startup from saved face samples.",
          options: [
            { value: "a", label: "<code>lifespan</code>, <code>vision.retrain_model</code>, and sample folders." },
            { value: "b", label: "The payroll table header." },
            { value: "c", label: "The app favicon." },
          ],
        },
        {
          question: "A route rejects bad date text before touching data. Which layer is responsible?",
          correct: "b",
          right: "Yes. Route-level validation helpers raise HTTP errors before persistence work.",
          wrong: "Validation lives in route models and helper functions near the API layer.",
          options: [
            { value: "a", label: "The React sidebar." },
            { value: "b", label: "FastAPI/Pydantic route validation in <code>CV/server.py</code>." },
            { value: "c", label: "OpenCV face detection." },
          ],
        },
        {
          question: "If you add a new server feature, what is the safest architecture pattern to follow?",
          correct: "c",
          right: "Exactly. Keep route contracts in <code>server.py</code> and storage operations in <code>data.py</code>.",
          wrong: "This project separates API routing from persistence helpers.",
          options: [
            { value: "a", label: "Put all logic in the frontend button." },
            { value: "b", label: "Write directly to JSON from React." },
            { value: "c", label: "Add a route contract in <code>server.py</code> and helper logic in <code>data.py</code>." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Contracts",
    file: "02-contracts.html",
    html: moduleSection(
      2,
      "Request And Response Contracts",
      "Pydantic models are the server's promise about what data enters and leaves each endpoint.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">A contract is a form with rules</h2>
      <p>A <span class="term" data-definition="A Pydantic model is a Python class that describes the shape and validation rules for data entering or leaving FastAPI routes.">Pydantic model</span> says which fields exist, which fields are optional, and which values are legal.</p>
      <div class="pattern-cards animate-in">
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-1)">IN</div><h4 class="pattern-title">Create models</h4><p class="pattern-desc">Define what the browser must send, such as name, department, wage, and schedule.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-2)">UPD</div><h4 class="pattern-title">Update models</h4><p class="pattern-desc">Allow partial edits by making fields optional.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-3)">OUT</div><h4 class="pattern-title">Response models</h4><p class="pattern-desc">Document what the route returns to the frontend.</p></div>
      </div>
      <p>File references: <code>CV/server.py:19-44</code>, <code>CV/server.py:46-153</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Employee input has validation</h2>
      ${codeBlock(
        H`<span class="code-line">class EmployeeCreate(BaseModel):</span>
<span class="code-line">    fullName: str = Field(min_length=1, max_length=120)</span>
<span class="code-line">    department: str = Field(min_length=1, max_length=120)</span>
<span class="code-line">    monthlyWage: float = Field(default=0, ge=0)</span>
<span class="code-line">    schedule: Schedule</span>`,
        [
          "Declare the payload needed to create one employee.",
          "Name and department cannot be empty and cannot be too long.",
          "Monthly wage defaults to zero and cannot be negative.",
          "Schedule must match the nested <code>Schedule</code> model.",
          "File reference: <code>CV/server.py:24-28</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Routes attach contracts to URLs</h2>
      ${codeBlock(
        H`<span class="code-line">@app.post(&quot;/employees&quot;, response_model=EmployeeRecord, status_code=201)</span>
<span class="code-line">def create_employee(payload: EmployeeCreate) -&gt; dict:</span>
<span class="code-line">    return data.create_employee(payload.model_dump())</span>`,
        [
          "Register a POST endpoint at <code>/employees</code>.",
          "Promise that the response will look like <code>EmployeeRecord</code>.",
          "Accept a validated <code>EmployeeCreate</code> object.",
          "Convert the model to a plain dictionary for the data layer.",
          "File reference: <code>CV/server.py:229-231</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">API</div>
        <div class="callout-content">
          <strong class="callout-title">Vocabulary to use with AI</strong>
          <p>Say "update the request and response contract" when a feature needs new fields in both backend models and frontend TypeScript interfaces.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-server-2", [
        {
          question: "You add an employee phone number. What must change on the server?",
          correct: "a",
          right: "Correct. Create/update/record models must know the new field before routes can validate and return it.",
          wrong: "A new data field needs contract changes, not only a UI input.",
          options: [
            { value: "a", label: "Relevant Pydantic models in <code>CV/server.py</code>." },
            { value: "b", label: "Only <code>components/ui/table.tsx</code>." },
            { value: "c", label: "Only <code>CV/haar_face.xml</code>." },
          ],
        },
        {
          question: "Why does <code>EmployeeUpdate</code> use optional fields?",
          correct: "b",
          right: "Exactly. PATCH requests often update only some fields.",
          wrong: "Optional fields let the route accept partial updates safely.",
          options: [
            { value: "a", label: "So employees can have no ID." },
            { value: "b", label: "So a PATCH request can send only the fields that changed." },
            { value: "c", label: "So face detection can run faster." },
          ],
        },
        {
          question: "A frontend request gets a 422 validation error after adding a feature. What is the likely mismatch?",
          correct: "c",
          right: "Yes. A 422 often means the posted JSON does not match the Pydantic contract.",
          wrong: "Think about the boundary where incoming JSON is validated.",
          options: [
            { value: "a", label: "The CSS border radius is too small." },
            { value: "b", label: "The webcam is paused." },
            { value: "c", label: "The frontend payload shape does not match the server model." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Persistence",
    file: "03-persistence.html",
    html: moduleSection(
      3,
      "JSON Persistence Layer",
      "Instead of a database, this demo stores employees, attendance, leaves, and face samples on disk.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">The data layer is a filing cabinet</h2>
      <p><code>CV/data.py</code> owns file paths and storage helpers. It uses <span class="term" data-definition="JSON is a text format for storing structured data as objects and arrays. It is easy for both JavaScript and Python to read.">JSON</span> arrays for records and normal folders for face image samples.</p>
      <div class="file-tree animate-in">
        <div class="ft-folder"><span class="ft-name">CV/data</span><span class="ft-desc">Server-side storage</span>
          <div class="ft-children">
            <div class="ft-file"><span class="ft-name">employees.json</span><span class="ft-desc">Employee records, schedules, wages, enrollment status</span></div>
            <div class="ft-file"><span class="ft-name">attendance.json</span><span class="ft-desc">Daily check-in rows</span></div>
            <div class="ft-file"><span class="ft-name">leaves.json</span><span class="ft-desc">Approved leave rows used by payroll</span></div>
            <div class="ft-folder"><span class="ft-name">face_samples</span><span class="ft-desc">Employee face crop folders</span></div>
          </div>
        </div>
      </div>
      <p>File references: <code>CV/data.py:9-23</code>, <code>CV/data.py:25-37</code>, <code>CV/data.py:139-157</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">The server creates missing files</h2>
      ${codeBlock(
        H`<span class="code-line">def ensure_data_files() -&gt; None:</span>
<span class="code-line">    DATA_DIR.mkdir(exist_ok=True)</span>
<span class="code-line">    FACE_SAMPLES_DIR.mkdir(exist_ok=True)</span>
<span class="code-line">    for path in (EMPLOYEES_PATH, ATTENDANCE_PATH, LEAVES_PATH):</span>
<span class="code-line">        if not path.exists():</span>
<span class="code-line">            path.write_text(&quot;[]\\n&quot;, encoding=&quot;utf-8&quot;)</span>`,
        [
          "Define a helper that makes storage safe to use.",
          "Create the main data directory if it is absent.",
          "Create the face sample directory too.",
          "For each JSON file, create an empty array if the file is missing.",
          "File reference: <code>CV/data.py:17-22</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Writes use a temporary file first</h2>
      ${codeBlock(
        H`<span class="code-line">def save_json(path: Path, rows: list[dict]) -&gt; None:</span>
<span class="code-line">    ensure_data_files()</span>
<span class="code-line">    temp_path = path.with_suffix(path.suffix + &quot;.tmp&quot;)</span>
<span class="code-line">    temp_path.write_text(json.dumps(rows, indent=2) + &quot;\\n&quot;, encoding=&quot;utf-8&quot;)</span>
<span class="code-line">    temp_path.replace(path)</span>`,
        [
          "Make sure folders and files exist before saving.",
          "Write the new JSON content into a temporary file.",
          "Replace the real file only after the temp write succeeds.",
          "This reduces the chance of leaving a half-written JSON file.",
          "File reference: <code>CV/data.py:33-37</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">DB</div>
        <div class="callout-content">
          <strong class="callout-title">Production note</strong>
          <p>This JSON layer is simple and readable for a demo. For multi-user production use, a real database would handle concurrent writes and querying more safely.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-server-3", [
        {
          question: "Employees disappear after a restart. Which files should you inspect first?",
          correct: "b",
          right: "Correct. Employee records live in <code>CV/data/employees.json</code>.",
          wrong: "The server stores demo data in JSON files under <code>CV/data</code>.",
          options: [
            { value: "a", label: "<code>app/globals.css</code>" },
            { value: "b", label: "<code>CV/data/employees.json</code> and the storage helper in <code>CV/data.py</code>." },
            { value: "c", label: "<code>public/vercel.svg</code>" },
          ],
        },
        {
          question: "Why is writing through a temp file better than overwriting directly?",
          correct: "a",
          right: "Yes. If the write fails midway, the original file is less likely to be corrupted.",
          wrong: "The temp file is a basic safety pattern for file persistence.",
          options: [
            { value: "a", label: "It reduces risk of a partially written JSON file." },
            { value: "b", label: "It makes OpenCV detect faces faster." },
            { value: "c", label: "It hides files from the frontend." },
          ],
        },
        {
          question: "If two users edit employees at the exact same time, what is the architectural concern?",
          correct: "c",
          right: "Correct. JSON files do not provide database-style concurrent write protection.",
          wrong: "The limitation is storage concurrency, not the table component.",
          options: [
            { value: "a", label: "Tailwind cannot render two buttons." },
            { value: "b", label: "FastAPI cannot accept HTTP requests." },
            { value: "c", label: "File-based JSON storage can lose updates without stronger locking or a database." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Routes",
    file: "04-routes.html",
    html: moduleSection(
      4,
      "Recognition And Attendance Routes",
      "The most important server route accepts one uploaded frame and returns both detections and new attendance rows.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Routes are named doors into the backend</h2>
      <p>Each route has a URL, a method, an input shape, and a response shape. Recognition routes accept uploaded files, while employee and leave routes use JSON bodies.</p>
      <div class="badge-list animate-in">
        <div class="badge-item"><code class="badge-code">GET /health</code><span class="badge-desc">Reports whether the model is ready and how many samples exist.</span></div>
        <div class="badge-item"><code class="badge-code">POST /employees/{id}/enroll</code><span class="badge-desc">Accepts multiple enrollment frames for one employee.</span></div>
        <div class="badge-item"><code class="badge-code">POST /recognition/frame</code><span class="badge-desc">Accepts one frame and returns detections plus created attendance.</span></div>
        <div class="badge-item"><code class="badge-code">GET /attendance/today</code><span class="badge-desc">Builds today's dashboard rows from employees and attendance.</span></div>
      </div>
      <p>File references: <code>CV/server.py:213-278</code>, <code>CV/server.py:381-421</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Recognition is a file upload route</h2>
      ${codeBlock(
        H`<span class="code-line">@app.post(&quot;/recognition/frame&quot;, response_model=RecognitionFrameResponse)</span>
<span class="code-line">async def recognize_frame(frame: UploadFile = File(...)) -&gt; dict:</span>
<span class="code-line">    frame_bytes = await frame.read()</span>
<span class="code-line"></span>
<span class="code-line">    try:</span>
<span class="code-line">        return vision.recognize_frame(app.state.vision_state, frame_bytes)</span>
<span class="code-line">    except ValueError as error:</span>
<span class="code-line">        raise HTTPException(status_code=400, detail=str(error)) from error</span>`,
        [
          "Register a POST route for one camera frame.",
          "Tell FastAPI to expect a file field named <code>frame</code>.",
          "Read the uploaded file bytes.",
          "Pass those bytes into the vision layer with shared model state.",
          "Turn invalid image data into a clear 400 response.",
          "File reference: <code>CV/server.py:266-273</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Attendance is assembled from two sources</h2>
      ${codeBlock(
        H`<span class="code-line">attendance_by_employee = {</span>
<span class="code-line">    int(record[&quot;id&quot;]): record</span>
<span class="code-line">    for record in data.list_attendance()</span>
<span class="code-line">    if record[&quot;date&quot;] == date_value</span>
<span class="code-line">}</span>`,
        [
          "Build a quick lookup table from attendance rows.",
          "Use employee ID as the lookup key.",
          "Only include records for the requested date.",
          "Then the route loops through employees and marks each present, late, or absent.",
          "File reference: <code>CV/server.py:391-395</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">API</div>
        <div class="callout-content">
          <strong class="callout-title">Why this route is useful</strong>
          <p>The frontend does not need to join employees and attendance itself. The server returns ready-to-render dashboard rows.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-server-4", [
        {
          question: "The frontend uploads a field named <code>photo</code> instead of <code>frame</code>. What happens?",
          correct: "b",
          right: "Correct. The route expects the uploaded file parameter named <code>frame</code>.",
          wrong: "File field names are part of the request contract.",
          options: [
            { value: "a", label: "The route automatically renames it." },
            { value: "b", label: "FastAPI cannot match it to <code>frame: UploadFile</code>." },
            { value: "c", label: "Payroll totals double." },
          ],
        },
        {
          question: "Why should dashboard status be computed on the server?",
          correct: "a",
          right: "Exactly. The server can combine employees and attendance consistently in one response.",
          wrong: "The dashboard route exists to return already combined rows.",
          options: [
            { value: "a", label: "It keeps the join between employee records and attendance records centralized." },
            { value: "b", label: "Because React cannot filter arrays." },
            { value: "c", label: "Because CSS tabs need Python." },
          ],
        },
        {
          question: "Invalid JPEG bytes are uploaded. Which route behavior should you expect?",
          correct: "c",
          right: "Yes. <code>vision.recognize_frame</code> raises <code>ValueError</code>, and the route turns that into HTTP 400.",
          wrong: "The route catches invalid image errors and returns a client-error response.",
          options: [
            { value: "a", label: "The server silently records attendance." },
            { value: "b", label: "The browser sidebar closes." },
            { value: "c", label: "A 400 response with an error detail." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Payroll",
    file: "05-payroll.html",
    html: moduleSection(
      5,
      "Leave And Payroll Logic",
      "Payroll combines attendance, approved leave, wage, and month dates into salary numbers.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Payroll is an accounting worksheet</h2>
      <p>The payroll route asks: for this month, which days were present, which absent days were approved leave, and how much salary remains after deductions?</p>
      <div class="flow-steps animate-in">
        <div class="flow-step"><div class="flow-step-num">1</div><p>Build all dates in month</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">2</div><p>Find present dates</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">3</div><p>Find paid leave dates</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">4</div><p>Deduct absent days</p></div>
      </div>
      <p>File references: <code>CV/server.py:324-378</code>, <code>CV/data.py:167-206</code>, <code>app/payroll/page.tsx:24-149</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">The route builds month dates</h2>
      ${codeBlock(
        H`<span class="code-line">def month_dates(month: str) -&gt; list[date]:</span>
<span class="code-line">    try:</span>
<span class="code-line">        year, month_number = [int(part) for part in month.split(&quot;-&quot;)]</span>
<span class="code-line">        last_day = calendar.monthrange(year, month_number)[1]</span>
<span class="code-line">    except ValueError as error:</span>
<span class="code-line">        raise HTTPException(status_code=400, detail=&quot;Month must be YYYY-MM.&quot;) from error</span>`,
        [
          "Accept text like <code>2026-04</code>.",
          "Split it into year and month number.",
          "Ask Python how many days are in that month.",
          "Return a clear 400 error if the format is wrong.",
          "File reference: <code>CV/server.py:178-184</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Net pay is computed per employee</h2>
      ${codeBlock(
        H`<span class="code-line">absent_days = len(date_values - present_dates - paid_leave_dates)</span>
<span class="code-line">monthly_wage = float(employee.get(&quot;monthlyWage&quot;, 0))</span>
<span class="code-line">daily_rate = monthly_wage / 30</span>
<span class="code-line">deduction = absent_days * daily_rate</span>
<span class="code-line">net_pay = max(monthly_wage - deduction, 0)</span>`,
        [
          "Start with all dates in the month, then remove present and paid-leave dates.",
          "Read this employee's monthly wage.",
          "Use a simple 30-day daily rate.",
          "Deduct one daily rate per absent day.",
          "Never return negative pay.",
          "File reference: <code>CV/server.py:351-355</code>.",
        ],
      )}
      <div class="callout callout-warning">
        <div class="callout-icon">RULE</div>
        <div class="callout-content">
          <strong class="callout-title">Business rule to confirm</strong>
          <p>This demo uses <code>monthly_wage / 30</code> even for months with 28 or 31 days. That may be intentional, but it is the exact rule to discuss before production use.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-server-5", [
        {
          question: "Payroll is wrong for a month with many approved leaves. Where should you inspect?",
          correct: "b",
          right: "Correct. The route builds <code>paid_leave_dates</code> and subtracts them from absence.",
          wrong: "The important logic is in the server payroll calculation.",
          options: [
            { value: "a", label: "The dashboard header title." },
            { value: "b", label: "<code>CV/server.py:340-355</code>, especially paid leave and absent day math." },
            { value: "c", label: "<code>CV/haar_face.xml</code>." },
          ],
        },
        {
          question: "Why does leave management load employees and leaves together?",
          correct: "a",
          right: "Exactly. Creating a leave requires choosing an existing employee.",
          wrong: "Leave records need employee context for selection and display.",
          options: [
            { value: "a", label: "The page needs employees for the selector and leaves for the table." },
            { value: "b", label: "OpenCV requires leave rows." },
            { value: "c", label: "The route cannot run without payroll being open." },
          ],
        },
        {
          question: "If the business wants half-day leave, which kind of change is this?",
          correct: "c",
          right: "Yes. It changes server contracts, persistence fields, UI forms, and payroll math.",
          wrong: "Half-day leave affects data shape and payroll calculation, not only visual text.",
          options: [
            { value: "a", label: "Only a CSS color change." },
            { value: "b", label: "Only a route rename." },
            { value: "c", label: "A cross-layer business-rule change." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
];

const frontendModules = [
  {
    nav: "App Shell",
    file: "01-app-shell.html",
    html: moduleSection(
      1,
      "The Frontend App Shell",
      "The Next.js app is organized as route folders, shared layouts, and reusable UI components.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">The frontend is the control panel</h2>
      <p>The project uses <span class="term" data-definition="Next.js is a React framework that uses files and folders to define web pages, routes, layouts, and build behavior.">Next.js</span> with the App Router. Each page folder under <code>app/</code> becomes a route, and most operational routes wrap themselves in the shared sidebar layout.</p>
      ${flowAnimation(
        [
          { icon: "/", label: "app/page.tsx" },
          { icon: "LAY", label: "Route layout" },
          { icon: "SIDE", label: "AppSidebar" },
          { icon: "PAGE", label: "Page component" },
          { icon: "UI", label: "shadcn UI" },
        ],
        [
          { highlight: "flow-actor-1", label: "The root page redirects users to the dashboard." },
          { highlight: "flow-actor-2", label: "Each section layout wraps the page with AppLayout.", packet: true, from: "actor-1", to: "actor-2" },
          { highlight: "flow-actor-3", label: "AppLayout renders the sidebar navigation.", packet: true, from: "actor-2", to: "actor-3" },
          { highlight: "flow-actor-4", label: "The active page renders its screen content.", packet: true, from: "actor-2", to: "actor-4" },
          { highlight: "flow-actor-5", label: "Reusable UI components provide buttons, cards, tables, dialogs, and badges.", packet: true, from: "actor-4", to: "actor-5" },
        ],
      )}
      <p>File references: <code>app/page.tsx:1-5</code>, <code>app/dashboard/layout.tsx:1-9</code>, <code>components/layout/app-layout.tsx:12-22</code>, <code>components/layout/app-sidebar.tsx:52-103</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Layouts make navigation consistent</h2>
      ${codeBlock(
        H`<span class="code-line">export function AppLayout({ children }: AppLayoutProps) {</span>
<span class="code-line">  return (</span>
<span class="code-line">    &lt;SidebarProvider&gt;</span>
<span class="code-line">      &lt;AppSidebar /&gt;</span>
<span class="code-line">      &lt;SidebarInset&gt;</span>
<span class="code-line">        &lt;div className=&quot;flex flex-col h-full min-h-screen&quot;&gt;</span>
<span class="code-line">          {children}</span>`,
        [
          "Define the wrapper used by the main app sections.",
          "Set up sidebar state for desktop and mobile behavior.",
          "Render the navigation once.",
          "Place the current route's page inside the content area.",
          "File reference: <code>components/layout/app-layout.tsx:12-18</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The app shell conversation</h2>
      ${chatWindow("chat-frontend-shell", [
        { sender: "Root Page", avatar: "/", color: "var(--color-actor-1)", text: "I send visitors straight to /dashboard." },
        { sender: "Route Layout", avatar: "LAY", color: "var(--color-actor-2)", text: "I wrap dashboard, monitor, employees, leave, payroll, and face registration with the same shell." },
        { sender: "Sidebar", avatar: "NAV", color: "var(--color-actor-3)", text: "I know the navigation items and highlight the active route." },
        { sender: "Page", avatar: "PG", color: "var(--color-actor-4)", text: "I focus on one workflow, like attendance, employee editing, or live monitoring." },
        { sender: "UI Kit", avatar: "UI", color: "var(--color-actor-5)", text: "I provide consistent cards, buttons, dialogs, tables, and badges." },
      ])}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-frontend-1", [
        {
          question: "You add a new Reports page. Where should the navigation item go?",
          correct: "b",
          right: "Correct. Sidebar route items are centralized in <code>mainNavItems</code>.",
          wrong: "Navigation labels live in the sidebar component, not each route page.",
          options: [
            { value: "a", label: "<code>CV/data.py</code>" },
            { value: "b", label: "<code>components/layout/app-sidebar.tsx</code>" },
            { value: "c", label: "<code>CV/requirements.txt</code>" },
          ],
        },
        {
          question: "Why do route folders have small <code>layout.tsx</code> files?",
          correct: "a",
          right: "Yes. They wrap each page with <code>AppLayout</code> so the shell stays consistent.",
          wrong: "The layout files are for wrapping route content, not API calls.",
          options: [
            { value: "a", label: "To reuse the shared sidebar layout around that page." },
            { value: "b", label: "To retrain the face model." },
            { value: "c", label: "To save attendance JSON." },
          ],
        },
        {
          question: "A page appears without the sidebar. What is the likely missing file or wrapper?",
          correct: "c",
          right: "Exactly. Check that the route has a layout returning <code>&lt;AppLayout&gt;{children}&lt;/AppLayout&gt;</code>.",
          wrong: "A missing shared route layout is the likely cause.",
          options: [
            { value: "a", label: "The OpenCV Haar XML." },
            { value: "b", label: "The payroll daily rate." },
            { value: "c", label: "A route <code>layout.tsx</code> that uses <code>AppLayout</code>." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "API Client",
    file: "02-api-client.html",
    html: moduleSection(
      2,
      "The API Client Gateway",
      "The frontend does not scatter raw fetch calls everywhere. It centralizes backend access in lib/cv-api.ts.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">The API client is the phonebook</h2>
      <p>Pages call named functions like <code>getEmployees</code> and <code>recognizeFrame</code>. Those functions hide URL building, <span class="term" data-definition="HTTP is the request-response protocol browsers use to talk to servers. Methods like GET, POST, PATCH, and DELETE describe the kind of action.">HTTP</span> methods, error handling, and response typing.</p>
      <div class="file-tree animate-in">
        <div class="ft-folder"><span class="ft-name">lib</span><span class="ft-desc">Frontend helpers</span>
          <div class="ft-children">
            <div class="ft-file"><span class="ft-name">cv-api.ts</span><span class="ft-desc">TypeScript types and all backend request helpers</span></div>
            <div class="ft-file"><span class="ft-name">video-frame.ts</span><span class="ft-desc">Turns video into JPEG blobs for upload</span></div>
            <div class="ft-file"><span class="ft-name">utils.ts</span><span class="ft-desc">Class-name merging helper used by UI components</span></div>
          </div>
        </div>
      </div>
      <p>File references: <code>lib/cv-api.ts:1-130</code>, <code>lib/cv-api.ts:132-163</code>, <code>lib/cv-api.ts:165-260</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">One request helper handles errors</h2>
      ${codeBlock(
        H`<span class="code-line">async function request&lt;T&gt;(path: string, init?: RequestInit): Promise&lt;T&gt; {</span>
<span class="code-line">  const response = await fetch(apiUrl(path), {</span>
<span class="code-line">    ...init,</span>
<span class="code-line">    cache: &quot;no-store&quot;,</span>
<span class="code-line">  });</span>
<span class="code-line"></span>
<span class="code-line">  if (!response.ok) {</span>`,
        [
          "Make a reusable typed request function.",
          "Call <code>fetch</code> with the full backend URL.",
          "Include caller-provided method, headers, and body.",
          "Disable browser caching for live operational data.",
          "If the server says the request failed, enter the error path.",
          "File reference: <code>lib/cv-api.ts:139-145</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Camera uploads use FormData</h2>
      ${codeBlock(
        H`<span class="code-line">export async function recognizeFrame(frame: Blob): Promise&lt;RecognitionFrameResponse&gt; {</span>
<span class="code-line">  const formData = new FormData();</span>
<span class="code-line">  formData.append(&quot;frame&quot;, frame, &quot;frame.jpg&quot;);</span>
<span class="code-line">  return request&lt;RecognitionFrameResponse&gt;(&quot;/recognition/frame&quot;, {</span>
<span class="code-line">    method: &quot;POST&quot;,</span>
<span class="code-line">    body: formData,</span>
<span class="code-line">  });</span>
<span class="code-line">}</span>`,
        [
          "Expose a frontend function specifically for one recognition frame.",
          "Create a browser form body that can carry a file.",
          "Attach the image as the field name the backend expects: <code>frame</code>.",
          "POST that form to the recognition endpoint.",
          "Return the typed detection and attendance response.",
          "File reference: <code>lib/cv-api.ts:215-222</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">TYPE</div>
        <div class="callout-content">
          <strong class="callout-title">Why TypeScript interfaces matter</strong>
          <p>The interfaces at the top of <code>cv-api.ts</code> mirror the server's response models. When a field changes, update both sides together.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-frontend-2", [
        {
          question: "A server error message is not showing in the UI. Which helper should you inspect?",
          correct: "b",
          right: "Correct. The shared <code>request</code> helper parses error details from failed responses.",
          wrong: "Error parsing is centralized in the API request helper.",
          options: [
            { value: "a", label: "<code>CV/haar_face.xml</code>" },
            { value: "b", label: "<code>request&lt;T&gt;</code> in <code>lib/cv-api.ts</code>." },
            { value: "c", label: "<code>app/favicon.ico</code>" },
          ],
        },
        {
          question: "You rename the backend upload field from <code>frame</code> to <code>image</code>. What else must change?",
          correct: "a",
          right: "Exactly. The frontend <code>FormData.append</code> field name must match the server parameter.",
          wrong: "Upload field names are part of the API contract.",
          options: [
            { value: "a", label: "<code>formData.append(&quot;frame&quot;, ...)</code> in <code>recognizeFrame</code>." },
            { value: "b", label: "Only the dashboard table labels." },
            { value: "c", label: "Only payroll daily rate math." },
          ],
        },
        {
          question: "Why is <code>cache: &quot;no-store&quot;</code> appropriate here?",
          correct: "c",
          right: "Yes. Attendance, recognition, and employee data can change during the session.",
          wrong: "These screens need fresh operational data, not cached old responses.",
          options: [
            { value: "a", label: "It makes CSS compile faster." },
            { value: "b", label: "It trains the KNN model." },
            { value: "c", label: "It prevents stale backend responses on live data screens." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Registration UI",
    file: "03-registration-ui.html",
    html: moduleSection(
      3,
      "Face Registration Screen",
      "This page is a two-step workflow: save employee details, then collect face samples.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Registration is a guided setup wizard</h2>
      <p>The page has local <span class="term" data-definition="React state is data remembered by a component. When state changes, React rerenders the screen to show the new value.">state</span> for form fields, camera status, saved employee, enrollment result, and error messages.</p>
      <div class="badge-list animate-in">
        <div class="badge-item"><code class="badge-code">Step 1</code><span class="badge-desc">Collect name, department, wage, and schedule.</span></div>
        <div class="badge-item"><code class="badge-code">Step 2</code><span class="badge-desc">Start camera and capture 18 face samples.</span></div>
        <div class="badge-item"><code class="badge-code">Complete</code><span class="badge-desc">Enable completion only after samples exist.</span></div>
      </div>
      <p>File references: <code>app/face-registration/page.tsx:41-88</code>, <code>app/face-registration/page.tsx:128-191</code>, <code>app/face-registration/page.tsx:193-540</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Saving details chooses create or update</h2>
      ${codeBlock(
        H`<span class="code-line">const savedEmployee = employee</span>
<span class="code-line">  ? await updateEmployee(employee.id, {</span>
<span class="code-line">      fullName: payload.fullName,</span>
<span class="code-line">      department: payload.department,</span>
<span class="code-line">      monthlyWage: payload.monthlyWage,</span>
<span class="code-line">      schedule: payload.schedule,</span>
<span class="code-line">    })</span>
<span class="code-line">  : await createEmployee(payload);</span>`,
        [
          "If an employee record already exists, update it.",
          "Send only the fields the backend allows for updates.",
          "If this is a new registration, create the employee.",
          "Store the returned employee record for step two.",
          "File reference: <code>app/face-registration/page.tsx:144-151</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Camera access is cleaned up</h2>
      ${codeBlock(
        H`<span class="code-line">React.useEffect(() =&gt; {</span>
<span class="code-line">  return () =&gt; {</span>
<span class="code-line">    const stream = videoRef.current?.srcObject;</span>
<span class="code-line">    if (stream instanceof MediaStream) {</span>
<span class="code-line">      stream.getTracks().forEach((track) =&gt; track.stop());</span>
<span class="code-line">    }</span>
<span class="code-line">  };</span>
<span class="code-line">}, []);</span>`,
        [
          "Register cleanup code for when the page leaves the screen.",
          "Find the camera stream attached to the video element.",
          "Confirm it is a real media stream.",
          "Stop every camera track so the webcam is released.",
          "File reference: <code>app/face-registration/page.tsx:81-88</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">UX</div>
        <div class="callout-content">
          <strong class="callout-title">User trust detail</strong>
          <p>Stopping media tracks matters. It prevents the camera indicator from staying on after the user leaves the page.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-frontend-3", [
        {
          question: "The Complete Registration button stays disabled. Which state should you inspect?",
          correct: "a",
          right: "Correct. Completion depends on the saved employee having <code>sampleCount &gt; 0</code>.",
          wrong: "The button depends on enrollment samples, not route metadata.",
          options: [
            { value: "a", label: "<code>hasEnrollmentSamples</code> and <code>employee.sampleCount</code>." },
            { value: "b", label: "<code>CV_ALLOWED_ORIGINS</code> only." },
            { value: "c", label: "The payroll month input." },
          ],
        },
        {
          question: "You add a new employee field to registration. What must be updated together?",
          correct: "c",
          right: "Exactly. The form, payload, TypeScript type, and backend contract must all agree.",
          wrong: "A cross-boundary field needs updates in both frontend and backend contracts.",
          options: [
            { value: "a", label: "Only the form label." },
            { value: "b", label: "Only <code>CV/haar_face.xml</code>." },
            { value: "c", label: "Form state, payload creation, <code>cv-api.ts</code> type, and server model." },
          ],
        },
        {
          question: "The camera light stays on after navigation. Which code pattern should you verify?",
          correct: "b",
          right: "Yes. Camera cleanup should stop every <code>MediaStreamTrack</code> on unmount.",
          wrong: "The webcam is controlled by the browser media stream, not payroll or JSON files.",
          options: [
            { value: "a", label: "Monthly payroll refresh." },
            { value: "b", label: "<code>stream.getTracks().forEach(track =&gt; track.stop())</code> cleanup." },
            { value: "c", label: "The employee delete confirmation text." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Live Monitor",
    file: "04-live-monitor.html",
    html: moduleSection(
      4,
      "Live Monitor Screen",
      "The live monitor combines camera access, repeated recognition calls, bounding boxes, and a recent-event feed.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Live monitor is an instrument panel</h2>
      <p>The page owns the camera and polling logic. Child components render the video overlay and recognition history.</p>
      <div class="file-tree animate-in">
        <div class="ft-folder"><span class="ft-name">live monitor path</span><span class="ft-desc">Browser-side recognition workflow</span>
          <div class="ft-children">
            <div class="ft-file"><span class="ft-name">app/live-monitor/page.tsx</span><span class="ft-desc">Camera setup, intervals, API calls, state</span></div>
            <div class="ft-file"><span class="ft-name">components/live-monitor/camera-feed.tsx</span><span class="ft-desc">Video element and detection boxes</span></div>
            <div class="ft-file"><span class="ft-name">components/live-monitor/recognition-feed.tsx</span><span class="ft-desc">Recent recognition list and status badges</span></div>
          </div>
        </div>
      </div>
      <p>File references: <code>app/live-monitor/page.tsx:21-200</code>, <code>components/live-monitor/camera-feed.tsx:46-165</code>, <code>components/live-monitor/recognition-feed.tsx:14-112</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">The page polls health and recent recognitions</h2>
      ${codeBlock(
        H`<span class="code-line">void loadHealth();</span>
<span class="code-line">void loadRecentRecognitions();</span>
<span class="code-line"></span>
<span class="code-line">const healthInterval = window.setInterval(() =&gt; void loadHealth(), 5000);</span>
<span class="code-line">const recognitionInterval = window.setInterval(() =&gt; void loadRecentRecognitions(), 2000);</span>`,
        [
          "Load health and recent events immediately when the page opens.",
          "Refresh backend health every 5 seconds.",
          "Refresh the recognition feed every 2 seconds.",
          "The page clears both intervals when it unmounts.",
          "File reference: <code>app/live-monitor/page.tsx:98-108</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Boxes are drawn with percentages</h2>
      ${codeBlock(
        H`<span class="code-line">const top = &#96;&#36;{detection.box.top * 100}%&#96;;</span>
<span class="code-line">const left = &#96;&#36;{detection.box.left * 100}%&#96;;</span>
<span class="code-line">const width = &#96;&#36;{detection.box.width * 100}%&#96;;</span>
<span class="code-line">const height = &#96;&#36;{detection.box.height * 100}%&#96;;</span>`,
        [
          "Take normalized box values from the backend.",
          "Convert each ratio into a CSS percentage.",
          "Apply those percentages to an absolutely positioned box.",
          "That makes overlays scale with the video element.",
          "File reference: <code>components/live-monitor/camera-feed.tsx:127-140</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">UI</div>
        <div class="callout-content">
          <strong class="callout-title">Frontend responsibility</strong>
          <p>The frontend does not decide who the face belongs to. It turns backend detection data into an understandable visual overlay.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-frontend-4", [
        {
          question: "The video works, but boxes never show. What should you inspect first?",
          correct: "a",
          right: "Correct. Check whether <code>recognizeFrame</code> returns detections and whether state reaches <code>CameraFeed</code>.",
          wrong: "The issue is likely in the recognition response path or overlay rendering.",
          options: [
            { value: "a", label: "<code>result.detections</code>, <code>setDetections</code>, and <code>CameraFeed</code> props." },
            { value: "b", label: "Leave reason input." },
            { value: "c", label: "Payroll month formatting." },
          ],
        },
        {
          question: "Why use percentages for bounding boxes?",
          correct: "b",
          right: "Exactly. The video can resize, so ratio-based boxes remain aligned.",
          wrong: "The purpose is responsive overlay positioning.",
          options: [
            { value: "a", label: "Because Python cannot return pixels." },
            { value: "b", label: "Because the rendered video size can differ from the uploaded frame size." },
            { value: "c", label: "Because CSS cannot use pixel values." },
          ],
        },
        {
          question: "The recent feed is stale but recognition boxes update. Which polling path is likely involved?",
          correct: "c",
          right: "Correct. Recent events come from <code>getRecentRecognitions</code>, not the detection overlay state alone.",
          wrong: "Separate state feeds drive boxes and recent events.",
          options: [
            { value: "a", label: "The employee wage input." },
            { value: "b", label: "The root redirect." },
            { value: "c", label: "<code>loadRecentRecognitions</code> and the 2 second interval." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Ops Screens",
    file: "05-ops-screens.html",
    html: moduleSection(
      5,
      "Dashboard, Employees, Leave, Payroll",
      "The remaining screens turn backend data into operational workflows for managers.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Each page owns one workflow</h2>
      <p>The frontend pattern is consistent: page loads data from <code>cv-api.ts</code>, stores it in React state, renders a table or feed, and exposes a refresh or mutation action.</p>
      <div class="pattern-cards animate-in">
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-1)">D</div><h4 class="pattern-title">Dashboard</h4><p class="pattern-desc">Calls <code>getTodayAttendance</code> and renders tabs for all, present, late, and absent.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-2)">E</div><h4 class="pattern-title">Employees</h4><p class="pattern-desc">Loads employees, edits wage/schedule, and deletes records.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-3)">L</div><h4 class="pattern-title">Leave</h4><p class="pattern-desc">Creates approved leave rows tied to employee IDs.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-4)">P</div><h4 class="pattern-title">Payroll</h4><p class="pattern-desc">Requests monthly payroll and renders salary totals.</p></div>
      </div>
      <p>File references: <code>app/dashboard/page.tsx:15-77</code>, <code>app/employees/page.tsx:12-113</code>, <code>app/leave-management/page.tsx:24-216</code>, <code>app/payroll/page.tsx:24-149</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Dashboard data load is the page pattern</h2>
      ${codeBlock(
        H`<span class="code-line">const loadAttendance = React.useCallback(async () =&gt; {</span>
<span class="code-line">  try {</span>
<span class="code-line">    setLoading(true);</span>
<span class="code-line">    setError(null);</span>
<span class="code-line">    setEmployees(await getTodayAttendance());</span>
<span class="code-line">    setLastUpdated(</span>`,
        [
          "Create a reusable async loader for the page.",
          "Turn on loading and clear any old error.",
          "Ask the API client for today's attendance rows.",
          "Store rows in React state so the feed rerenders.",
          "Update a visible last-refreshed time.",
          "File reference: <code>app/dashboard/page.tsx:21-32</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Employee edits flow upward</h2>
      ${codeBlock(
        H`<span class="code-line">async function handleSaveSchedule(</span>
<span class="code-line">  id: number,</span>
<span class="code-line">  data: { monthlyWage: number; schedule: Employee[&quot;schedule&quot;] },</span>
<span class="code-line">) {</span>
<span class="code-line">  try {</span>
<span class="code-line">    setSavingEmployeeId(id);</span>
<span class="code-line">    const updatedEmployee = await updateEmployee(id, data);</span>`,
        [
          "The page receives an employee ID and new wage/schedule data.",
          "It records which employee is saving so the UI can disable controls.",
          "It sends the patch through the shared API client.",
          "Then it replaces the updated employee in local state.",
          "File reference: <code>app/employees/page.tsx:35-44</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">PAT</div>
        <div class="callout-content">
          <strong class="callout-title">Common React pattern</strong>
          <p>Child components collect user input, but parent pages often own data loading and saving because they understand the full page state.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-frontend-5", [
        {
          question: "You add a new backend field to attendance rows. Which frontend locations are likely affected?",
          correct: "a",
          right: "Correct. Update the TypeScript interface and whichever dashboard/feed component displays it.",
          wrong: "Backend fields cross into <code>cv-api.ts</code> types and display components.",
          options: [
            { value: "a", label: "<code>AttendanceTodayItem</code> in <code>cv-api.ts</code> and dashboard components." },
            { value: "b", label: "Only <code>CV/requirements.txt</code>." },
            { value: "c", label: "Only the face cascade XML." },
          ],
        },
        {
          question: "A save button should show only one row as saving. What state pattern does this repo use?",
          correct: "b",
          right: "Exactly. It stores the active employee ID rather than a single global boolean.",
          wrong: "The employee page tracks the specific ID being saved or deleted.",
          options: [
            { value: "a", label: "Delete every row before saving." },
            { value: "b", label: "Store <code>savingEmployeeId</code> and compare it to each row ID." },
            { value: "c", label: "Put the saving state in <code>haar_face.xml</code>." },
          ],
        },
        {
          question: "The payroll page shows old totals after changing the month. Where is month state used?",
          correct: "c",
          right: "Correct. <code>loadPayroll</code> depends on <code>month</code> and calls <code>getMonthlyPayroll(month)</code>.",
          wrong: "Payroll data is loaded from the payroll page state and API call.",
          options: [
            { value: "a", label: "The live monitor detection overlay." },
            { value: "b", label: "The face registration sample loop." },
            { value: "c", label: "<code>app/payroll/page.tsx</code>, especially <code>month</code> and <code>loadPayroll</code>." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
];

const integrationModules = [
  {
    nav: "Whole System",
    file: "01-whole-system.html",
    html: moduleSection(
      1,
      "The Whole System Map",
      "Precision Pass is a Next.js frontend connected to a FastAPI computer-vision backend with JSON file storage.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Four layers cooperate</h2>
      <p>The project is integrated through clear boundaries: browser pages, API helper functions, Python routes, and backend data/vision modules.</p>
      ${flowAnimation(
        [
          { icon: "NX", label: "Next.js pages" },
          { icon: "TS", label: "cv-api.ts" },
          { icon: "PY", label: "FastAPI" },
          { icon: "CV", label: "vision.py" },
          { icon: "JSON", label: "data.py + files" },
        ],
        [
          { highlight: "flow-actor-1", label: "A user clicks a button or opens a page in the browser." },
          { highlight: "flow-actor-2", label: "The page calls a typed API helper.", packet: true, from: "actor-1", to: "actor-2" },
          { highlight: "flow-actor-3", label: "FastAPI receives the HTTP request and validates it.", packet: true, from: "actor-2", to: "actor-3" },
          { highlight: "flow-actor-4", label: "Vision code handles image-specific work when needed.", packet: true, from: "actor-3", to: "actor-4" },
          { highlight: "flow-actor-5", label: "Data helpers persist records in JSON and image folders.", packet: true, from: "actor-3", to: "actor-5" },
        ],
      )}
      <p>Key references: <code>lib/cv-api.ts:132-260</code>, <code>CV/server.py:189-421</code>, <code>CV/vision.py:35-306</code>, <code>CV/data.py:9-286</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Integration is mostly function calls across boundaries</h2>
      ${codeBlock(
        H`<span class="code-line">const API_BASE_URL =</span>
<span class="code-line">  process.env.NEXT_PUBLIC_CV_API_BASE_URL?.replace(/\/$/, &quot;&quot;) ?? &quot;http://127.0.0.1:8000&quot;;</span>
<span class="code-line"></span>
<span class="code-line">function apiUrl(path: string): string {</span>
<span class="code-line">  return &#96;&#36;{API_BASE_URL}&#36;{path}&#96;;</span>
<span class="code-line">}</span>`,
        [
          "Read the backend base URL from environment configuration if available.",
          "Remove a trailing slash to avoid malformed URLs.",
          "Fall back to the local FastAPI server on port 8000.",
          "Create a helper that combines the base URL with a route path.",
          "File reference: <code>lib/cv-api.ts:132-137</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The layers speak in a group chat</h2>
      ${chatWindow("chat-integration-system", [
        { sender: "Next.js Page", avatar: "NX", color: "var(--color-actor-1)", text: "I know what the user wants and what state should appear on screen." },
        { sender: "API Client", avatar: "TS", color: "var(--color-actor-2)", text: "I translate that action into an HTTP request to the Python backend." },
        { sender: "FastAPI Route", avatar: "PY", color: "var(--color-actor-3)", text: "I validate inputs and choose the right backend helper." },
        { sender: "Vision Module", avatar: "CV", color: "var(--color-actor-4)", text: "I handle images, models, face boxes, confidence, and recent recognition events." },
        { sender: "Data Module", avatar: "DB", color: "var(--color-actor-5)", text: "I persist employees, attendance, leaves, and face sample folders." },
      ])}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-integration-1", [
        {
          question: "The frontend cannot reach the backend in development. What integration setting should you inspect?",
          correct: "b",
          right: "Correct. The frontend builds URLs from <code>NEXT_PUBLIC_CV_API_BASE_URL</code> or the local fallback.",
          wrong: "Connection failures often start at the base URL and CORS boundary.",
          options: [
            { value: "a", label: "The employee table column order." },
            { value: "b", label: "<code>NEXT_PUBLIC_CV_API_BASE_URL</code> and the FastAPI server address." },
            { value: "c", label: "The payroll daily rate only." },
          ],
        },
        {
          question: "Which layer should own official attendance creation?",
          correct: "c",
          right: "Exactly. Attendance writes must be server-side so refreshes and clients cannot duplicate records.",
          wrong: "The frontend displays attendance, but the backend owns official writes.",
          options: [
            { value: "a", label: "CSS badge component." },
            { value: "b", label: "Browser-only React state." },
            { value: "c", label: "The backend data/vision path." },
          ],
        },
        {
          question: "When an AI assistant suggests writing directly to JSON from React, what should you say?",
          correct: "a",
          right: "Correct. React should call the API; the server should own persistence.",
          wrong: "This project has an API boundary for exactly that reason.",
          options: [
            { value: "a", label: "No. Keep file writes behind FastAPI routes and <code>CV/data.py</code>." },
            { value: "b", label: "Yes. Browsers can safely edit server files." },
            { value: "c", label: "Only if payroll is closed." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Registration Flow",
    file: "02-registration-flow.html",
    html: moduleSection(
      2,
      "Registration End To End",
      "Employee creation and face enrollment cross every important layer except payroll.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">One workflow, many files</h2>
      <p>Registration starts in a React form, creates an employee through the API client, uploads face samples, saves image files, updates employee metadata, and retrains the recognition model.</p>
      <div class="flow-steps animate-in">
        <div class="flow-step"><div class="flow-step-num">1</div><p>Form state</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">2</div><p>POST /employees</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">3</div><p>Capture samples</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">4</div><p>POST enroll</p></div>
        <div class="flow-arrow">-&gt;</div>
        <div class="flow-step"><div class="flow-step-num">5</div><p>Retrain model</p></div>
      </div>
      <p>References: <code>app/face-registration/page.tsx:128-191</code>, <code>lib/cv-api.ts:173-212</code>, <code>CV/server.py:229-263</code>, <code>CV/vision.py:81-114</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Frontend and backend use matching field names</h2>
      ${codeBlock(
        H`<span class="code-line">const payload = {</span>
<span class="code-line">  fullName: formData.fullName.trim(),</span>
<span class="code-line">  department: formData.department.trim(),</span>
<span class="code-line">  monthlyWage: Number(formData.monthlyWage) || 0,</span>
<span class="code-line">  schedule: {</span>
<span class="code-line">    checkInTime: formData.checkInTime,</span>
<span class="code-line">    checkOutTime: formData.checkOutTime,</span>
<span class="code-line">  },</span>`,
        [
          "Collect values from React form state.",
          "Trim text fields before sending them.",
          "Convert wage text into a number.",
          "Build the nested schedule object expected by the backend.",
          "The names match <code>EmployeeCreate</code> in <code>CV/server.py</code>.",
          "File reference: <code>app/face-registration/page.tsx:134-142</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Enrollment response updates the UI</h2>
      ${codeBlock(
        H`<span class="code-line">const result = await enrollEmployee(employee.id, frames);</span>
<span class="code-line">setEmployee(result.employee);</span>
<span class="code-line">setEnrollmentResult(result);</span>
<span class="code-line">await loadHealth();</span>`,
        [
          "Upload all captured frame blobs for this employee.",
          "Replace local employee state with the server's updated version.",
          "Store accepted and rejected sample counts for the summary panel.",
          "Refresh model health because retraining may have changed readiness.",
          "File reference: <code>app/face-registration/page.tsx:180-183</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">SYNC</div>
        <div class="callout-content">
          <strong class="callout-title">Integration rule</strong>
          <p>After a mutation, trust the server response. Do not guess sample counts on the client when the backend decides which frames were accepted.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-integration-2", [
        {
          question: "The UI says enrollment complete, but live recognition still says model not ready. What should you inspect?",
          correct: "c",
          right: "Correct. Follow the path from accepted samples to retraining and health refresh.",
          wrong: "The symptom crosses enrollment, retraining, and health.",
          options: [
            { value: "a", label: "Only the sidebar tooltip." },
            { value: "b", label: "Only payroll totals." },
            { value: "c", label: "Accepted sample count, <code>vision.retrain_model</code>, and <code>getHealth</code>." },
          ],
        },
        {
          question: "Why should the client not assume all 18 uploaded frames were accepted?",
          correct: "a",
          right: "Exactly. The backend rejects frames with no face or multiple faces.",
          wrong: "The backend has sample-quality rules the browser does not reproduce.",
          options: [
            { value: "a", label: "The backend may reject bad frames and returns the official accepted count." },
            { value: "b", label: "React cannot count to 18." },
            { value: "c", label: "FastAPI always deletes the frames." },
          ],
        },
        {
          question: "Adding a required employee field affects which layers?",
          correct: "b",
          right: "Yes. It touches form state, API types, server models, persistence, and display surfaces.",
          wrong: "A required field crosses the frontend-backend data contract.",
          options: [
            { value: "a", label: "Only <code>CV/haar_face.xml</code>." },
            { value: "b", label: "Frontend form, <code>cv-api.ts</code>, server Pydantic models, and data storage." },
            { value: "c", label: "Only recognition feed badges." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Recognition Flow",
    file: "03-recognition-flow.html",
    html: moduleSection(
      3,
      "Live Recognition To Dashboard",
      "A camera frame can update the overlay immediately and later appear as attendance on the dashboard.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Real-time result, persistent side effect</h2>
      <p>The live monitor gets immediate <span class="term" data-definition="A response is the data sent back by the server after a request. In this project, recognition responses include detections and any created attendance records.">response</span> data for overlays. Separately, the backend may write attendance, which the dashboard reads through a different route.</p>
      <div class="pattern-cards animate-in">
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-1)">BOX</div><h4 class="pattern-title">Immediate</h4><p class="pattern-desc">Detection boxes and names update in live monitor state.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-2)">LOG</div><h4 class="pattern-title">Recent feed</h4><p class="pattern-desc">Recognition events are buffered in memory and polled by the sidebar feed.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-3)">ATT</div><h4 class="pattern-title">Persistent</h4><p class="pattern-desc">First daily matches are saved to <code>attendance.json</code>.</p></div>
      </div>
      <p>References: <code>app/live-monitor/page.tsx:116-144</code>, <code>CV/vision.py:117-205</code>, <code>CV/data.py:258-286</code>, <code>app/dashboard/page.tsx:21-32</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Recognition updates local UI state</h2>
      ${codeBlock(
        H`<span class="code-line">const result = await recognizeFrame(frame);</span>
<span class="code-line">setDetections(result.detections);</span>
<span class="code-line">if (result.createdAttendance.length &gt; 0) {</span>
<span class="code-line">  void loadRecentRecognitions();</span>
<span class="code-line">}</span>`,
        [
          "Send one captured frame to the server.",
          "Use returned detections to draw overlays on the current video.",
          "If a new attendance row was created, refresh the recent recognition list.",
          "The dashboard will see persistent attendance when it asks its route.",
          "File reference: <code>app/live-monitor/page.tsx:129-133</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">The backend bundles both outcomes</h2>
      ${codeBlock(
        H`<span class="code-line">return {</span>
<span class="code-line">    &quot;detections&quot;: detections,</span>
<span class="code-line">    &quot;createdAttendance&quot;: created_attendance,</span>
<span class="code-line">}</span>`,
        [
          "Return every face detection for the overlay.",
          "Also return only attendance rows that were newly created now.",
          "This lets the frontend distinguish a fresh check-in from a repeat sighting.",
          "File reference: <code>CV/vision.py:202-205</code>.",
        ],
      )}
      <div class="callout callout-info">
        <div class="callout-icon">STATE</div>
        <div class="callout-content">
          <strong class="callout-title">Two kinds of state</strong>
          <p>Detection boxes are temporary UI state. Attendance records are persistent business state. Confusing those two causes many bugs.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-integration-3", [
        {
          question: "Boxes show on live monitor, but dashboard still says absent. What is the likely explanation?",
          correct: "b",
          right: "Correct. Detection can be unknown or repeat seen without creating attendance.",
          wrong: "A detection overlay does not always mean an attendance row was written.",
          options: [
            { value: "a", label: "Every box always writes attendance." },
            { value: "b", label: "The detection did not create a new attendance record, or the dashboard has not refreshed." },
            { value: "c", label: "The payroll page must be open first." },
          ],
        },
        {
          question: "Where should you debug whether a match actually wrote attendance?",
          correct: "a",
          right: "Exactly. The backend returns <code>createdAttendance</code> and writes through <code>record_attendance_if_first</code>.",
          wrong: "The badge display only reflects the server decision.",
          options: [
            { value: "a", label: "<code>CV/vision.py</code> around <code>created_attendance</code> and <code>CV/data.py</code> attendance write." },
            { value: "b", label: "Only the sidebar icon list." },
            { value: "c", label: "Only the global CSS variables." },
          ],
        },
        {
          question: "Why is <code>createdAttendance</code> an array, not a single object?",
          correct: "c",
          right: "Yes. One uploaded frame can contain multiple faces, so multiple attendance rows might be created.",
          wrong: "The route processes all detected faces in a frame.",
          options: [
            { value: "a", label: "Because payroll requires arrays for styling." },
            { value: "b", label: "Because FastAPI cannot return objects." },
            { value: "c", label: "Because one frame may contain more than one recognized employee." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Admin Data Flow",
    file: "04-admin-data-flow.html",
    html: moduleSection(
      4,
      "Employee, Leave, Payroll Integration",
      "The admin screens share employee IDs as the thread tying schedules, leave, attendance, and salary together.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Employee ID is the stitching key</h2>
      <p>Employees have IDs. Attendance rows use <code>id</code>. Leave rows use <code>employeeId</code>. Payroll joins all of that per employee.</p>
      <div class="badge-list animate-in">
        <div class="badge-item"><code class="badge-code">employees.json</code><span class="badge-desc">Owns ID, name, department, schedule, wage, enrollment.</span></div>
        <div class="badge-item"><code class="badge-code">attendance.json</code><span class="badge-desc">Uses employee ID and date to record check-ins.</span></div>
        <div class="badge-item"><code class="badge-code">leaves.json</code><span class="badge-desc">Uses employeeId to apply approved leave to payroll.</span></div>
        <div class="badge-item"><code class="badge-code">payroll/monthly</code><span class="badge-desc">Combines all three into salary rows.</span></div>
      </div>
      <p>References: <code>CV/data.py:56-76</code>, <code>CV/data.py:184-206</code>, <code>CV/server.py:324-378</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Deleting an employee cleans related records</h2>
      ${codeBlock(
        H`<span class="code-line">remaining_attendance = [</span>
<span class="code-line">    record</span>
<span class="code-line">    for record in attendance_records</span>
<span class="code-line">    if record[&quot;id&quot;] != employee_to_delete[&quot;id&quot;]</span>
<span class="code-line">]</span>
<span class="code-line">leave_records = load_json(LEAVES_PATH)</span>
<span class="code-line">remaining_leaves = [</span>`,
        [
          "Build a new attendance list without this employee's rows.",
          "Load leave records too.",
          "The function also removes leaves for the deleted employee.",
          "Later it removes the employee's face sample folder.",
          "File reference: <code>CV/data.py:115-134</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Payroll walks all employees</h2>
      ${codeBlock(
        H`<span class="code-line">response_items: list[dict] = []</span>
<span class="code-line">for employee in data.list_employees():</span>
<span class="code-line">    employee_id = employee[&quot;id&quot;]</span>
<span class="code-line">    present_dates = {</span>
<span class="code-line">        record[&quot;date&quot;]</span>
<span class="code-line">        for record in attendance_records</span>`,
        [
          "Start the payroll response list.",
          "Process every employee, even if they have no attendance.",
          "Use employee ID to find that person's attendance rows.",
          "Then the route also checks approved leave and absence.",
          "File reference: <code>CV/server.py:331-337</code>.",
        ],
      )}
      <div class="callout callout-accent">
        <div class="callout-icon">KEY</div>
        <div class="callout-content">
          <strong class="callout-title">Universal data lesson</strong>
          <p>IDs connect records across files. When an ID changes or is deleted, every related feature can be affected.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-integration-4", [
        {
          question: "A deleted employee still appears in payroll. What should you inspect?",
          correct: "a",
          right: "Correct. Deletion should update employee, attendance, leave, sample files, and retrain the model.",
          wrong: "The issue is likely cleanup of related records or stale loaded data.",
          options: [
            { value: "a", label: "<code>data.delete_employee</code>, related JSON files, and page refresh state." },
            { value: "b", label: "Only the camera overlay corners." },
            { value: "c", label: "Only the Google Fonts link." },
          ],
        },
        {
          question: "Why does payroll loop over employees instead of attendance rows only?",
          correct: "b",
          right: "Exactly. Employees with no attendance still need absent-day calculations.",
          wrong: "Payroll must include people even when they did not check in.",
          options: [
            { value: "a", label: "Because attendance rows cannot store dates." },
            { value: "b", label: "Because every employee needs a payroll row, including absent employees." },
            { value: "c", label: "Because React tables cannot render attendance." },
          ],
        },
        {
          question: "A leave row points to a missing employee. What symptom can appear?",
          correct: "c",
          right: "Correct. The data layer enriches missing employees as <code>Unknown employee</code>.",
          wrong: "Leave rows are enriched from employee records, so missing IDs affect display and payroll logic.",
          options: [
            { value: "a", label: "The face detector file becomes invalid." },
            { value: "b", label: "All buttons disappear." },
            { value: "c", label: "Leave display can show unknown employee or payroll leave math can miss the intended person." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
  {
    nav: "Debugging",
    file: "05-debugging.html",
    html: moduleSection(
      5,
      "Configuration And Debugging Map",
      "When something breaks, follow the boundary: browser, API helper, FastAPI route, vision/data helper, stored file.",
      H`
    <div class="screen animate-in">
      <h2 class="screen-heading">Debug from the nearest boundary</h2>
      <p>Integration bugs are easiest when you ask: did the browser capture the right data, did <code>cv-api.ts</code> send the right request, did FastAPI receive it, did the helper write the expected file?</p>
      <div class="pattern-cards animate-in">
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-1)">URL</div><h4 class="pattern-title">Base URL</h4><p class="pattern-desc"><code>NEXT_PUBLIC_CV_API_BASE_URL</code> points the frontend to the backend.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-2)">CORS</div><h4 class="pattern-title">Allowed origins</h4><p class="pattern-desc"><code>CV_ALLOWED_ORIGINS</code> controls which browser origins can call FastAPI.</p></div>
        <div class="pattern-card"><div class="pattern-icon" style="background: var(--color-actor-3)">ENV</div><h4 class="pattern-title">Vision knobs</h4><p class="pattern-desc">Recognition cooldowns and unknown threshold are environment-controlled.</p></div>
      </div>
      <p>References: <code>lib/cv-api.ts:132-137</code>, <code>CV/server.py:156-161</code>, <code>CV/vision.py:41-50</code>.</p>
    </div>

    <div class="screen">
      <h2 class="screen-heading">CORS is configured from environment</h2>
      ${codeBlock(
        H`<span class="code-line">def allowed_origins() -&gt; list[str]:</span>
<span class="code-line">    raw = os.getenv(</span>
<span class="code-line">        &quot;CV_ALLOWED_ORIGINS&quot;,</span>
<span class="code-line">        &quot;http://localhost:3000,http://127.0.0.1:3000&quot;,</span>
<span class="code-line">    )</span>
<span class="code-line">    return [origin.strip() for origin in raw.split(&quot;,&quot;) if origin.strip()]</span>`,
        [
          "Define a helper for browser origins allowed to call the API.",
          "Read a comma-separated environment variable if present.",
          "Default to the usual local Next.js dev addresses.",
          "Split and clean the list before passing it into CORS middleware.",
          "File reference: <code>CV/server.py:156-161</code>.",
        ],
      )}
    </div>

    <div class="screen">
      <h2 class="screen-heading">Health is the first backend check</h2>
      ${codeBlock(
        H`<span class="code-line">@app.get(&quot;/health&quot;, response_model=HealthResponse)</span>
<span class="code-line">def health() -&gt; dict:</span>
<span class="code-line">    vision_state = app.state.vision_state</span>
<span class="code-line">    return {</span>
<span class="code-line">        &quot;status&quot;: &quot;ok&quot;,</span>
<span class="code-line">        &quot;modelReady&quot;: vision.is_model_ready(vision_state),</span>
<span class="code-line">        &quot;employeeCount&quot;: len(data.list_employees()),</span>
<span class="code-line">        &quot;sampleCount&quot;: vision_state.sample_count,</span>`,
        [
          "Expose a simple status endpoint.",
          "Read the shared vision state created at startup.",
          "Return whether the model is ready.",
          "Return employee count and sample count for quick diagnosis.",
          "File reference: <code>CV/server.py:213-221</code>.",
        ],
      )}
      <div class="callout callout-warning">
        <div class="callout-icon">DBG</div>
        <div class="callout-content">
          <strong class="callout-title">Debug order</strong>
          <p>Before debugging face math, check <code>/health</code>. If the backend is down or modelReady is false, recognition cannot work reliably.</p>
        </div>
      </div>
    </div>

    <div class="screen">
      <h2 class="screen-heading">Apply the idea</h2>
      ${quiz("quiz-integration-5", [
        {
          question: "The browser console shows a CORS error. Where should you look?",
          correct: "b",
          right: "Correct. Check the frontend origin and <code>CV_ALLOWED_ORIGINS</code> used by FastAPI CORS middleware.",
          wrong: "CORS errors are about browser origin permission at the API boundary.",
          options: [
            { value: "a", label: "The payroll table footer." },
            { value: "b", label: "<code>CV_ALLOWED_ORIGINS</code> and <code>allowed_origins()</code> in <code>CV/server.py</code>." },
            { value: "c", label: "The face sample filename timestamp only." },
          ],
        },
        {
          question: "The UI says failed to reach CV backend. What is the first fast check?",
          correct: "a",
          right: "Yes. Confirm the backend process and <code>/health</code> before deeper debugging.",
          wrong: "Start by checking the backend process and health route.",
          options: [
            { value: "a", label: "Run the FastAPI server and visit <code>http://127.0.0.1:8000/health</code>." },
            { value: "b", label: "Delete all CSS files." },
            { value: "c", label: "Change every employee name." },
          ],
        },
        {
          question: "You want to tune false unknown recognitions. Which boundary should you change carefully?",
          correct: "c",
          right: "Correct. The threshold lives in vision state and changes recognition behavior.",
          wrong: "Unknown tuning belongs in the vision configuration, not display-only components.",
          options: [
            { value: "a", label: "The route title text." },
            { value: "b", label: "The sidebar icon order." },
            { value: "c", label: "<code>CV_UNKNOWN_DISTANCE_THRESHOLD</code> and sample quality." },
          ],
        },
      ])}
    </div>
`,
    ),
  },
];

const courses = [
  {
    dir: "01-face-detection",
    title: "Course 1: How Face Detection Works",
    accent: accents.teal,
    modules: faceModules,
    summary: "Camera frames, enrollment samples, OpenCV face boxes, KNN recognition, and attendance side effects.",
  },
  {
    dir: "02-server",
    title: "Course 2: How The Server Works",
    accent: accents.forest,
    modules: serverModules,
    summary: "FastAPI routes, Pydantic contracts, JSON persistence, recognition endpoints, leave, and payroll.",
  },
  {
    dir: "03-frontend",
    title: "Course 3: How The Frontend Works",
    accent: accents.coral,
    modules: frontendModules,
    summary: "Next.js route layouts, the API client, face registration, live monitor, and admin screens.",
  },
  {
    dir: "04-integration",
    title: "Course 4: How Everything Is Integrated",
    accent: accents.amber,
    modules: integrationModules,
    summary: "End-to-end flows across browser pages, API helpers, FastAPI, vision logic, and JSON storage.",
  },
];

function buildBase(course) {
  const baseTemplate = fs.readFileSync(baseTemplatePath, "utf8");
  return baseTemplate
    .replace(
      '<link rel="stylesheet" href="styles.css">',
      `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">\n  <link rel="stylesheet" href="styles.css">`,
    )
    .replace(
      "  </style>",
      `    .translation-code .hljs {\n      background: transparent;\n      padding: 0;\n    }\n    .translation-block {\n      grid-template-columns: 1fr;\n    }\n    .translation-english {\n      border-left: 0;\n      border-top: 3px solid var(--color-accent);\n    }\n    .course-switcher {\n      max-width: var(--content-width-wide);\n      margin: var(--space-12) auto var(--space-16);\n      padding: var(--space-6);\n      display: grid;\n      grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);\n      gap: var(--space-4);\n      align-items: stretch;\n    }\n    .course-switch-link {\n      display: flex;\n      flex-direction: column;\n      justify-content: center;\n      min-height: 96px;\n      padding: var(--space-5);\n      border: 1px solid var(--color-border);\n      border-radius: var(--radius-md);\n      background: var(--color-surface);\n      color: var(--color-text);\n      text-decoration: none;\n      box-shadow: var(--shadow-sm);\n      transition: transform var(--duration-fast) var(--ease-out), border-color var(--duration-fast), box-shadow var(--duration-fast);\n    }\n    .course-switch-link:hover {\n      transform: translateY(-2px);\n      border-color: var(--color-accent-muted);\n      box-shadow: var(--shadow-md);\n    }\n    .course-switch-link.next { text-align: right; }\n    .course-switch-kicker {\n      font-family: var(--font-mono);\n      font-size: var(--text-xs);\n      color: var(--color-accent);\n      text-transform: uppercase;\n      letter-spacing: 0.05em;\n      margin-bottom: var(--space-2);\n    }\n    .course-switch-title {\n      font-family: var(--font-display);\n      font-size: var(--text-lg);\n      font-weight: 700;\n      line-height: var(--leading-snug);\n    }\n    @media (max-width: 768px) {\n      .course-switcher { grid-template-columns: 1fr; }\n      .course-switch-link.next { text-align: left; }\n    }\n  </style>`,
    )
    .replace(
      '<script src="main.js" defer></script>',
      `<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js" defer></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/languages/typescript.min.js" defer></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/languages/python.min.js" defer></script>\n  <script src="main.js" defer></script>\n  <script>\n    document.addEventListener("DOMContentLoaded", () => {\n      if (window.hljs) {\n        window.hljs.highlightAll();\n      }\n    });\n  </script>`,
    )
    .replaceAll("COURSE_TITLE", course.title)
    .replaceAll("ACCENT_COLOR", course.accent.color)
    .replaceAll("ACCENT_HOVER", course.accent.hover)
    .replaceAll("ACCENT_LIGHT", course.accent.light)
    .replaceAll("ACCENT_MUTED", course.accent.muted)
    .replace("NAV_DOTS", navDots(course.modules))
    .replace(/\n        <!--[\s\S]*?One <button> per module[\s\S]*?-->/, "");
}

function courseFooter(course, index) {
  const previous = courses[index - 1];
  const next = courses[index + 1];
  const previousLink = previous
    ? H`  <a class="course-switch-link previous" href="../${previous.dir}/index.html">
    <span class="course-switch-kicker">Previous course</span>
    <span class="course-switch-title">${previous.title.replace(/^Course \d+: /, "")}</span>
  </a>`
    : H`  <a class="course-switch-link previous" href="../index.html">
    <span class="course-switch-kicker">Course overview</span>
    <span class="course-switch-title">Back to all courses</span>
  </a>`;
  const nextLink = next
    ? H`  <a class="course-switch-link next" href="../${next.dir}/index.html">
    <span class="course-switch-kicker">Next course</span>
    <span class="course-switch-title">${next.title.replace(/^Course \d+: /, "")}</span>
  </a>`
    : H`  <a class="course-switch-link next" href="../index.html">
    <span class="course-switch-kicker">Finished</span>
    <span class="course-switch-title">Back to all courses</span>
  </a>`;

  return H`  <section class="course-switcher" aria-label="Course navigation">
${previousLink}
${nextLink}
  </section>
  </main>

</body>
</html>
`;
}

function writeCourse(course, index) {
  const courseDir = path.join(outRoot, course.dir);
  const moduleDir = path.join(courseDir, "modules");
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.writeFileSync(path.join(courseDir, "_base.html"), buildBase(course), "utf8");
  fs.writeFileSync(path.join(courseDir, "_footer.html"), courseFooter(course, index), "utf8");
  for (const mod of course.modules) {
    fs.writeFileSync(path.join(moduleDir, mod.file), mod.html, "utf8");
  }
}

function writeLanding() {
  const cards = courses
    .map(
      (course) => H`      <a class="course-card" href="./${course.dir}/index.html">
        <span class="course-number">${course.title.match(/Course \d+/)?.[0] ?? "Course"}</span>
        <h2>${course.title.replace(/^Course \d+: /, "")}</h2>
        <p>${course.summary}</p>
        <span class="open-link">Open course</span>
      </a>`,
    )
    .join("\n");

  fs.writeFileSync(
    path.join(outRoot, "index.html"),
    H`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Precision Pass Project Courses</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: light;
      --bg: #FAF7F2;
      --paper: #FFFFFF;
      --text: #2C2A28;
      --muted: #6B6560;
      --border: #E5DFD6;
      --accent: #D94F30;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: "DM Sans", sans-serif;
      line-height: 1.6;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 64px 24px;
    }
    header {
      max-width: 780px;
      margin-bottom: 40px;
    }
    .eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--accent);
    }
    h1 {
      font-family: "Bricolage Grotesque", sans-serif;
      font-size: clamp(40px, 6vw, 72px);
      line-height: .98;
      margin: 12px 0 20px;
    }
    .lead {
      font-size: 18px;
      color: var(--muted);
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .course-card {
      display: block;
      min-height: 280px;
      padding: 26px;
      border: 1px solid var(--border);
      border-top: 4px solid var(--accent);
      border-radius: 16px;
      background: var(--paper);
      color: inherit;
      text-decoration: none;
      box-shadow: 0 10px 30px rgba(44, 42, 40, .08);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .course-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 42px rgba(44, 42, 40, .12);
    }
    .course-number {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--accent);
    }
    h2 {
      font-family: "Bricolage Grotesque", sans-serif;
      font-size: 26px;
      line-height: 1.05;
      margin: 16px 0 14px;
    }
    p {
      color: var(--muted);
      margin: 0;
    }
    .open-link {
      display: inline-block;
      margin-top: 28px;
      font-weight: 700;
      color: var(--accent);
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="eyebrow">Precision Pass learning path</div>
      <h1>Four detailed beginner-friendly courses for this project</h1>
      <p class="lead">Each course is browser-ready and includes file references, real code translations, quizzes, architecture visuals, and interactive flows.</p>
    </header>
    <section class="grid">
${cards}
    </section>
  </main>
</body>
</html>
`,
    "utf8",
  );
}

for (const [index, course] of courses.entries()) {
  writeCourse(course, index);
}
writeLanding();

console.log(`Generated ${courses.length} courses in ${outRoot}`);
