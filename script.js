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
		this.userAnswer;
		this.incorrectAnswers = incorrectAnswers;
		this.answerOrder;
	}

	generateAnswerOpts() {
		let el = ``;
		if (this.type === "boolean") {
			el = `
				<label><input type="radio" name="multi-choice-opt" value="True" ${
					this.userAnswer === "True" ? "checked" : ""
				}>True</label>
				<label><input type="radio" name="multi-choice-opt" value="False" ${
					this.userAnswer === "False" ? "checked" : ""
				}>False</label>`;
		}
		if (this.type === "multiple") {
			// Generate answer order only once
			if (!this.answerOrder) {
				const randomNum = Math.floor(Math.random() * 4) + 1;
				this.answerOrder = [...this.incorrectAnswers];
				this.answerOrder.splice(randomNum, 0, this.answer);
			}
			this.answerOrder.forEach((answer) => {
				el += `
					<label>
						<input type="radio" name="multi-choice-opt" value="${answer}" ${
					this.userAnswer === answer ? "checked" : ""
				}>
						<span>${answer}</span>
					</label>`;
			});
		}
		return el;
	}

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
		this.numQuestions = parseInt(numQuestions);
		this.category = category;
		this.difficulty = difficulty;
		this.type = type;
		this.score = 0;
		this.currentQuestionIndex = 1;
	}

	async init() {
		await this.getQuestions();
		this.initButtonListener();
		this.initMultiSelectListener();
		this.startQuiz();
	}

	initButtonListener() {
		const prevNextBtn = document.querySelector(".buttons");
		const nextBtn = document.querySelector(".next-button");
		const prevBtn = document.querySelector(".prev-button");
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
		const quizActions = document.querySelector(".quiz-actions");
		const submitBtn = document.querySelector(".submit-quiz");
		const addQuestion = document.querySelector(".add-question");
		quizActions.addEventListener("click", (e) => {
			if (e.target == submitBtn) {
				// run submitQuiz()
				// Maybe add logic to bring up a warning if user has not answered all questions
			}
			if (e.target == addQuestion) {
			}
		});
	}

	initMultiSelectListener() {
		const ansOptsCont = document.querySelector(".ans-opts-container");
		ansOptsCont.addEventListener("change", (e) => {
			const currentQuestion = this.getCurrentQuestion();
			currentQuestion.userAnswer = e.target.value;
		});
	}

	startQuiz() {
		// Display the originally hidden elements
		document.querySelectorAll(".hidden").forEach((el) => {
			el.classList.remove("hidden");
		});
		// Hide the api form
		document.querySelector(".api-form").classList.add("hidden");
		this.displayQuestion();
		// setupNavButtonListeners(quiz);
	}

	async getQuestions() {
		const baseUrl = `https://opentdb.com/api.php`;
		const params = new URLSearchParams({ amount: this.numQuestions });
		// Example what comes at the end for customizing fetched questions amount=10&category=9&difficulty=easy&type=multiple
		if (this.category !== "any") params.append("category", this.category);
		if (this.difficulty !== "any") params.append("difficulty", this.difficulty);
		if (this.type !== "any") params.append("type", this.type);
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
			this.questionsList = questionsList;
		} catch (error) {} // ADD ERROR CATCHING HERE
	}

	getCurrentQuestion() {
		return this.questionsList[this.currentQuestionIndex - 1];
	}

	displayQuestion() {
		console.log(this);
		const questionNum = document.querySelector(".question-number");
		const questionTextHeading = document.querySelector(".question-text");
		const answerOptions = document.querySelector(".ans-opts-container");
		const currentQuestion = this.getCurrentQuestion();

		questionNum.textContent = `Question: ${this.currentQuestionIndex}`;
		questionTextHeading.textContent = currentQuestion.question_text;
		const ansOptsHtml = currentQuestion.generateAnswerOpts();
		answerOptions.innerHTML = ansOptsHtml;

		const questionCard = document.querySelector(".quiz-actions");
		if (
			this.currentQuestionIndex === this.numQuestions ||
			this.allQuestionsAnswered()
		) {
			questionCard.classList.remove("hidden-end");
		} else if (!questionCard.classList.contains("hidden-end")) {
			questionCard.classList.add("hidden-end");
		}
	}

	allQuestionsAnswered() {
		return this.questionsList.every(
			(question) => question.userAnswer !== undefined
		);
	}

	submitQuiz() {}
}
