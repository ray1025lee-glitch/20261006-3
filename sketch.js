let allQuestions = [];      // 從 Google Sheets 載入的所有題目
let quizQuestions = [];     // 每次隨機抽出的 5 題
let currentQuestion = 0;
let score = 0;
let selectedOption = null;
let isAnswered = false;
let optionButtons = [];
let nextButton;             
let restartButton;          
let isLoading = true;       
let errorMessage = "";      // 用來顯示錯誤訊息
let canvas;                 // 宣告畫布全域變數

// 你的 Google 試算表 CSV 連結（加上時間戳記防快取）
const sheetCSVUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2PuVttEbQSfrgiEG_A7GgFvVtsN9nG-RcG5p59AnpJla6C-ORQtN2MWpjbPYjVrYaQFMpRCH2T25D/pub?output=csv&t=' + Date.now();

function preload() {
  loadTable(sheetCSVUrl, 'csv', 'header', 
    (table) => {
      allQuestions = table;
      isLoading = false;
      console.log("題庫載入成功！總筆數：", allQuestions.getRowCount());
      if (allQuestions.getRowCount() > 0) {
        initQuiz();
      } else {
        errorMessage = "試算表內容是空的，請檢查 Google 試算表！";
      }
    }, 
    (err) => {
      isLoading = false;
      errorMessage = "無法讀取 Google 試算表，請檢查 CSV 連結或是否已發布！";
      console.error("載入失敗詳細錯誤：", err);
    }
  );
}

function setup() {
  let canvasWidth = min(windowWidth - 40, 650);
  let canvasHeight = min(windowHeight - 120, 540);
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("quiz-container");
 
  createOptionButtons();
 
  nextButton = createButton("進入下一題");
  nextButton.style('background-color', '#4f46e5');
  nextButton.style('color', '#ffffff');
  nextButton.style('border', 'none');
  nextButton.style('border-radius', '10px');
  nextButton.style('font-family', '"Noto Serif TC", serif');
  nextButton.style('font-weight', '700');
  nextButton.style('cursor', 'pointer');
  nextButton.hide();
  nextButton.mousePressed(goToNextQuestion);
  nextButton.mouseOver(() => nextButton.style('background-color', '#4338ca'));
  nextButton.mouseOut(() => nextButton.style('background-color', '#4f46e5'));

  restartButton = createButton("重新測驗");
  restartButton.style('background-color', '#4f46e5');
  restartButton.style('color', '#ffffff');
  restartButton.style('border', 'none');
  restartButton.style('border-radius', '12px');
  restartButton.style('font-family', '"Noto Serif TC", serif');
  restartButton.style('font-weight', '700');
  restartButton.style('cursor', 'pointer');
  restartButton.hide();
  restartButton.mousePressed(restartQuiz);
  restartButton.mouseOver(() => restartButton.style('background-color', '#4338ca'));
  restartButton.mouseOut(() => restartButton.style('background-color', '#4f46e5'));

  updateLayout();
}

function initQuiz() {
  let rows = allQuestions.getRows();
  let tempQuestions = [];

  for (let r of rows) {
    tempQuestions.push({
      prompt: r.getString('prompt'),
      options: [
        r.getString('optionA'),
        r.getString('optionB'),
        r.getString('optionC'),
        r.getString('optionD')
      ],
      correct: int(r.getString('correct'))
    });
  }

  // Fisher-Yates 隨機洗牌
  for (let i = tempQuestions.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    let temp = tempQuestions[i];
    tempQuestions[i] = tempQuestions[j];
    tempQuestions[j] = temp;
  }

  let numToDraw = min(5, tempQuestions.length);
  quizQuestions = tempQuestions.slice(0, numToDraw);
 
  currentQuestion = 0;
  score = 0;
  isAnswered = false;
  selectedOption = null;

  if (quizQuestions.length > 0) {
    resetOptionButtonStyles();
    updateButtonText(0);
    updateLayout(); 
  }
}

function draw() {
  background(15, 23, 42); 
  textFont('Noto Serif TC');

  if (isLoading) {
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text("正在從 Google 試算表載入題庫...", width / 2, height / 2);
    for (let btn of optionButtons) {
      btn.hide();
    }
    return;
  }

  if (errorMessage !== "") {
    fill(248, 113, 113);
    textSize(16);
    textAlign(CENTER, CENTER);
    text(errorMessage, width / 2, height / 2);
    for (let btn of optionButtons) {
      btn.hide();
    }
    return;
  }

  if (currentQuestion < quizQuestions.length) {
    if (quizQuestions.length > 0 && optionButtons.length === 4) {
      let currentLabelCheck = optionButtons[0].html();
      if (currentLabelCheck.endsWith(": ") || currentLabelCheck === "") {
        updateButtonText(currentQuestion);
      }
    }
    drawQuizScreen();
    restartButton.hide();
  } else {
    drawScoreScreen();
    for (let btn of optionButtons) {
      btn.hide();
    }
    nextButton.hide();
    restartButton.show();
  }
}

function drawQuizScreen() {
  let q = quizQuestions[currentQuestion];
  let isMobile = width < 480;

  // 1. 顯示題目進度
  fill(148, 163, 184);
  noStroke();
  textSize(isMobile ? 14 : 16);
  textAlign(LEFT, TOP);
  text(`題目 ${currentQuestion + 1} / ${quizQuestions.length}`, 24, 20);

  // 2. 顯示題目內容（支援自動換行）
  fill(255);
  textSize(isMobile ? 20 : 24);
  textStyle(BOLD);
  text(q.prompt, 24, 50, width - 48);

  // 3. 答對/答錯回饋訊息
  if (isAnswered) {
    textSize(isMobile ? 14 : 16);
    textStyle(BOLD);
    let labels = ["A", "B", "C", "D"];
    let feedbackY = height - 55; 
   
    if (selectedOption === q.correct) {
      fill(74, 222, 128);
      text("✔ 答對了！", 24, feedbackY);
    } else {
      fill(248, 113,
