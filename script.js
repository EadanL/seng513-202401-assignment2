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

// Profile icon listener (needs to be outside Quiz class to work on page load)
const profileBtn = document.querySelector(".profile-icon");
profileBtn.addEventListener("click", (e) => {
	console.log("profile clicked");

	displayUserProfile();
});

function displayUserProfile() {
	const apiForm = document.querySelector(".api-form");
	const questionCard = document.querySelector(".question-card");
	if (
		apiForm.classList.contains("hidden") &&
		!questionCard.classList.contains("hidden")
	) {
		toggleHidden([".question-card", ".question-nav", ".profile-card"]);
	} else toggleHidden([".api-form", ".profile-card"]);
}

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
	const quiz = new Quiz(Date.now(), category, difficulty, type);
	await quiz.init(numQuestions);
});
// TODO: Implement the User class (properties like username and score history)
class User {
	constructor(username) {
		this.username = username;
		this.quizHistory;
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
		this.answer = this.decodeHTMLEntities(correctAnswer);
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
	constructor(start_time, category, difficulty, type) {
		this.questionsList = [];
		this.start_time = start_time;
		this.numQuestions = 0;
		this.category = category;
		this.difficulty = difficulty;
		this.type = type;
		this.score = 0;
		this.currentQuestionIndex = 1;
		this.apiURL;
		this.lastReqTime;
		this.user;
		this.questionGenerator = null;
	}

	async init(numQuestions) {
		await this.getQuestions(parseInt(numQuestions));
		this.initMultiSelectListener();
		this.initButtonListener();
		this.initQuestionNavListener();
		this.questionGenerator = this.createQuestionGenerator();
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
				this.updateActiveNavLink();
			}
			if (e.target == prevBtn && this.currentQuestionIndex > 1) {
				this.currentQuestionIndex--;
				this.displayQuestion();
				this.updateActiveNavLink();
			}
		});
		const quizActions = document.querySelector(".quiz-actions");
		const action1 = document.querySelector(".action-1");
		const action2 = document.querySelector(".action-2");
		quizActions.addEventListener("click", async (e) => {
			if (e.target == action1) {
				// Check if button still has add-question class
				if (e.target.classList.contains("add-question")) {
					await this.addNewQuestion();
					this.currentQuestionIndex++;
					this.buildQuestionNav(); // Rebuild nav with new question
					this.displayQuestion();
					this.updateActiveNavLink();
				} else {
					// It's now "View Scores" - implement this functionality
					console.log("View Scores clicked");
				}
			}
			if (e.target == action2) {
				// Check if button still has submit-quiz class
				if (e.target.classList.contains("submit-quiz")) {
					this.submitQuiz();
				} else {
					// It's now "Return Home"
					location.reload();
				}
			}
		});

		const saveUsernameBtn = document.querySelector(".username-btn");
		saveUsernameBtn.addEventListener("click", (e) => {
			const usernameInput = document.querySelector(".username-input");
			const username = usernameInput.value;
		});
	}

	initMultiSelectListener() {
		const ansOptsCont = document.querySelector(".ans-opts-container");
		ansOptsCont.addEventListener("change", (e) => {
			const currentQuestion = this.getCurrentQuestion();
			currentQuestion.userAnswer = e.target.value;
		});
	}

	initQuestionNavListener() {
		const questionNav = document.querySelector(".question-list");
		questionNav.addEventListener("click", (e) => {
			if (e.target.tagName === "A") {
				e.preventDefault();
				const questionNum = parseInt(e.target.dataset.questionNum);
				if (
					questionNum &&
					questionNum >= 1 &&
					questionNum <= this.numQuestions
				) {
					this.currentQuestionIndex = questionNum;
					this.displayQuestion();
					this.updateActiveNavLink();
				}
			}
		});
	}

	initInputListener() {
		const usernameInput = document.querySelector(".username-input");
		const usernameBtn = document.querySelector(".username-btn ");
		const action1Btn = document.querySelector(".action1");
		usernameInput.addEventListener("input", (e) => {
			if (usernameInput.value) usernameBtn.classList.remove("hidden");
			else usernameBtn.classList.add("hidden");
		});
		usernameBtn.addEventListener("click", (e) => {
			this.user = new User(usernameInput.value);
		});
	}

	startQuiz() {
		// Hide the api form and show question content
		toggleHidden([".question-card", ".question-nav", ".api-form"]);
		this.buildQuestionNav();
		this.displayQuestion();
	}

	buildQuestionNav() {
		const navQstnList = document.querySelector(".question-list");
		navQstnList.innerHTML = ""; // Clear placeholder

		this.questionsList.forEach((question, index) => {
			const li = document.createElement("li");
			const a = document.createElement("a");
			a.href = "#";
			a.textContent = `Question ${index + 1}`;
			a.dataset.questionNum = index + 1;
			a.classList.add("question-nav-link");
			if (index === 0) {
				a.classList.add("active");
			}
			li.appendChild(a);
			navQstnList.appendChild(li);
		});
	}

	updateActiveNavLink() {
		const navLinks = document.querySelectorAll(".question-nav-link");
		navLinks.forEach((link, index) => {
			if (index + 1 === this.currentQuestionIndex) {
				link.classList.add("active");
			} else {
				link.classList.remove("active");
			}
		});
	}

	async getQuestions(numQuestions) {
		console.log(numQuestions);
		// Rate limiting: ensure 5 seconds between requests
		const timeSinceLastRequest = Date.now() - this.lastRequestTime;
		const delayNeeded = 5000 - timeSinceLastRequest;
		if (delayNeeded > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayNeeded));
		}
		this.lastRequestTime = Date.now();

		const baseUrl = `https://opentdb.com/api.php`;
		const params = new URLSearchParams({ amount: numQuestions });
		// Example what comes at the end for customizing fetched questions amount=10&category=9&difficulty=easy&type=multiple
		if (this.category !== "any") params.append("category", this.category);
		if (this.difficulty !== "any") params.append("difficulty", this.difficulty);
		if (this.type !== "any") params.append("type", this.type);
		if (sessionToken) params.append("token", sessionToken);
		this.apiURL = `${baseUrl}?${params.toString()}`;
		try {
			const response = await fetch(this.apiURL);

			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}
			const result = await response.json();
			console.log(result);
			result.results.forEach((question) => {
				console.log(this.questionsList.length);
				this.questionsList.push(
					new Question(
						this.questionsList.length + 1,
						question.type,
						question.difficulty,
						question.question,
						question.correct_answer,
						question.incorrect_answers
					)
				);
				this.numQuestions++;
			});
		} catch (error) {} // TODO: add error catching
	}

	// Generator function to create new questions one at a time
	async *createQuestionGenerator() {
		while (true) {
			// Rate limiting: ensure 5 seconds between requests
			const timeSinceLastRequest = Date.now() - this.lastRequestTime;
			const delayNeeded = 5000 - timeSinceLastRequest;
			if (delayNeeded > 0) {
				await new Promise((resolve) => setTimeout(resolve, delayNeeded));
			}
			this.lastRequestTime = Date.now();

			try {
				console.log(this.apiURL);
				const response = await fetch(
					this.apiURL.replace(/amount=\d+/, "amount=1")
				);

				if (!response.ok) {
					throw new Error(`Response status: ${response.status}`);
				}

				const result = await response.json();

				if (result.results && result.results.length > 0) {
					const questionData = result.results[0];
					const newQuestion = new Question(
						this.questionsList.length + 1,
						questionData.type,
						questionData.difficulty,
						questionData.question,
						questionData.correct_answer,
						questionData.incorrect_answers
					);

					yield newQuestion;
				}
			} catch (error) {
				console.error("Error fetching question:", error);
				yield null;
			}
		}
	}

	// Add a new question using the generator
	async addNewQuestion() {
		if (!this.questionGenerator) {
			this.questionGenerator = this.createQuestionGenerator();
		}

		const result = await this.questionGenerator.next();

		if (result.value) {
			this.questionsList.push(result.value);
			this.numQuestions++;
		} else {
			console.error("Failed to generate new question");
		}
	}

	*generateID() {
		let i = 1;
		while (true) {
			yield i;
			i++;
		}
	}

	getCurrentQuestion() {
		return this.questionsList[this.currentQuestionIndex - 1];
	}

	async displayQuestion() {
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
			questionCard.classList.toggle("hidden");
		} else if (!questionCard.classList.contains("hidden")) {
			questionCard.classList.toggle("hidden");
		}
	}

	displayResults() {
		this.initInputListener();
		toggleHidden([".question-card", ".result-card", ".question-nav"]);
		if (this.user !== undefined) {
			console.log("welcome back");
		} else {
			toggleHidden([".username-input", ".username-prompt"]);
		}
		const scoreH1 = document.querySelector(".quiz-score");
		scoreH1.textContent = `Score: ${this.score}%`;
		const action1 = document.querySelector(".action-1");
		action1.classList.toggle("add-question");
		const action2 = document.querySelector(".action-2");
		action2.classList.toggle("submit-quiz");
		action1.textContent = "View Scores";
		action2.textContent = "Return Home";
	}

	allQuestionsAnswered() {
		return this.questionsList.every(
			(question) => question.userAnswer !== undefined
		);
	}

	submitQuiz() {
		if (!this.allQuestionsAnswered()) {
			const submitConfirmation = confirm(
				"Not all questions have been answered! Click Cancel to return to the quiz or OK to submit anyways"
			);
			if (!submitConfirmation) {
				return;
			}
		}
		// Using call to calculate score in different context
		calculateScore.call(this, this.questionsList);
		this.displayResults();
	}
}

function toggleHidden(classes) {
	classes.forEach((className) => {
		const classElem = document.querySelectorAll(className);
		if (classElem) {
			classElem.forEach((el) => {
				console.log(el);
				el.classList.toggle("hidden");
			});
		}
	});
}

function calculateScore(questions) {
	let tempScore = 0;
	questions.forEach((question) => {
		if (question.userAnswer === question.answer) tempScore++;
	});
	this.score = ((tempScore / questions.length) * 100).toFixed(2);
}
