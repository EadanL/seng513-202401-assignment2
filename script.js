// Get form and submit button
const apiForm = document.querySelector(".api-form");

let sessionToken = null;

const getSessionToken = async () => {
	const response = await fetch(
		"https://opentdb.com/api_token.php?command=request"
	);
	const data = await response.json();
	return data.token;
};

// Get the session token when the page loads
(async () => {
	sessionToken = await getSessionToken();
})();

// Handle form submission
apiForm.addEventListener("submit", async (event) => {
	event.preventDefault(); // Prevent form from submitting/refreshing page

	// Get form values
	const numQuestions = document.getElementById("trivia_amount").value;
	const category = document.querySelector(
		'select[name="trivia_category"]'
	).value;
	const difficulty = document.querySelector(
		'select[name="trivia_difficulty"]'
	).value;
	const type = document.querySelector('select[name="trivia_type"]').value;

	// Create and start the quiz
	const quiz = new Quiz(Date.now(), numQuestions, category, difficulty, type);
	await quiz.init();
	startQuiz(quiz);
});

class User {
	constructor(username) {
		this.username = username;
	}
}

// Could create two classes (MC/long answer question) that inherit from this.
class Question {
	constructor(id, type, difficulty, question, correctAnswer, incorrectAnswers) {
		// Maybe add attributes: difficulty, category, type (wont need of we split this class)
		this.id = id;
		this.type = type;
		this.difficulty = difficulty;
		this.question_text = this.decodeHTMLEntities(question);
		this.answer = correctAnswer;
		this.user_answer;
		this.incorrectAnswers = incorrectAnswers;
	}

	generateAnswerOpts = () => {
		let el = ``;
		if (this.type === "boolean") {
			el = `
				<label><input type="radio" name="multi-choice-opt" value="True">True</label>
				<label><input type="radio" name="multi-choice-opt" value="False">False</label>`;
		}
		if (this.type === "multiple") {
			const randomNum = Math.floor(Math.random() * 4) + 1;
			let allOpts = [...this.incorrectAnswers];
			allOpts.splice(randomNum, 0, this.answer);
			for (let i = 0; i < 4; i++) {
				el += `
					<label>
						<input type="radio" name="multi-choice-opt" value="${allOpts[i]}">
						<span>${allOpts[i]}</span>
					</label>`;
			}
		}
		return el;
	};

	// This doesn't have to be a member function
	decodeHTMLEntities = (text) => {
		const textarea = document.createElement("textarea");
		textarea.innerHTML = text;
		return textarea.value;
	};
}

class Quiz {
	constructor(start_time, numQuestions, category, difficulty, type) {
		this.questionsList = [];
		this.start_time = start_time;
		this.numQuestions = numQuestions;
		this.category = category;
		this.difficulty = difficulty;
		this.type = type;
		this.score = 0;
		this.currentQuestionIndex = 1;
	}

	async init() {
		this.questionsList = await getQuestions(
			this.numQuestions,
			this.category,
			this.difficulty,
			this.type
		);
	}

	getCurrentQuestion = () => {
		return this.questionsList[this.currentQuestionIndex - 1];
	};

	initButtonEvents() {
		const prevNextBtn = document.querySelector(".buttons");
		const nextBtn = document.querySelector(".next-button");
		const prevBtn = document.querySelector(".prev-button");
		console.log(this.currentQuestionIndex);
		prevNextBtn.addEventListener("click", (e) => {
			if (
				e.target == nextBtn &&
				this.currentQuestionIndex < this.numQuestions
			) {
				this.currentQuestionIndex++;
				this.displayQuestion();
			}
			if (e.target == prevBtn && this.currentQuestionIndex > 1) {
				this.currentQuestionIndex--;
				this.displayQuestion();
			}
		});
	}

	displayQuestion() {
		const questionNum = document.querySelector(".question-number");
		const questionTextHeading = document.querySelector(".question-text");
		const answerOptions = document.querySelector(".ans-opts-container");
		const currentQuestion = this.getCurrentQuestion();

		questionNum.textContent = `Question: ${this.currentQuestionIndex}`;
		questionTextHeading.textContent = currentQuestion.question_text;
		const ansOptsHtml = currentQuestion.generateAnswerOpts();
		answerOptions.innerHTML = ansOptsHtml;
	}
}

function startQuiz(quiz) {
	// Display the originally hidden elements
	document.querySelectorAll(".hidden").forEach((el) => {
		el.classList.remove("hidden");
	});
	// Hide the api form
	document.querySelector(".api-form").classList.add("hidden");
	quiz.displayQuestion();
	quiz.initButtonEvents();
	// setupNavButtonListeners(quiz);
}

// Displays the current question and gets the next question ready
// Include logic to adapt the difficulty of the next question based on previous answers
// Use this function to grab new questions if the user wants to extend the quiz.
function* questionGenerator() {}

async function getQuestions(nQuestions, category, difficulty, type) {
	const baseUrl = `https://opentdb.com/api.php`;
	const params = new URLSearchParams({ amount: nQuestions });
	// Example what comes at the end for customizing fetched questions amount=10&category=9&difficulty=easy&type=multiple
	if (category !== "any") params.append("category", category);
	if (difficulty !== "any") params.append("difficulty", difficulty);
	if (type !== "any") params.append("type", type);
	if (sessionToken) params.append("token", sessionToken);
	const url = `${baseUrl}?${params.toString()}`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}
		const result = await response.json();
		let questionsList = [];
		let i = 1;
		result.results.forEach((question) => {
			questionsList.push(
				new Question(
					i,
					question.type,
					question.difficulty,
					question.question,
					question.correct_answer,
					question.incorrect_answers
				)
			);
			i++;
		});
		return questionsList;
	} catch (error) {}
}
