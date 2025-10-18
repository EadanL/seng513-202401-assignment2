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

// Track where the user came from when viewing profile
let previousView = "api-form"; // Can be 'api-form', 'quiz', or 'results'
let currentQuiz = null; // Store reference to current quiz

// Profile icon listener (needs to be outside Quiz class to work on page load)
const profileBtn = document.querySelector(".profile-icon");
profileBtn.addEventListener("click", (e) => {
	console.log("profile clicked");

	// Check if user has a username set
	const storedUsername = User.getStoredUsername();
	if (!storedUsername) {
		// Prompt for username first
		promptForUsername(() => {
			displayUserProfile();
		});
	} else {
		displayUserProfile();
	}
});

function promptForUsername(callback) {
	const usernamePrompt = prompt(
		"Please enter a username to view your profile:"
	);
	if (usernamePrompt && usernamePrompt.trim()) {
		const username = usernamePrompt.trim();
		const user = new User(username);
		User.setStoredUsername(username);
		if (currentQuiz) {
			currentQuiz.user = user;
		}
		callback();
	}
}

function displayUserProfile() {
	const apiForm = document.querySelector(".api-form");
	const questionCard = document.querySelector(".question-card");
	const resultCard = document.querySelector(".result-card");
	const questionNav = document.querySelector(".question-nav");
	const profileCard = document.querySelector(".profile-card");

	// Determine current view
	if (!apiForm.classList.contains("hidden")) {
		previousView = "api-form";
	} else if (!questionCard.classList.contains("hidden")) {
		previousView = "quiz";
	} else if (!resultCard.classList.contains("hidden")) {
		previousView = "results";
	}

	// Hide all views
	apiForm.classList.add("hidden");
	questionCard.classList.add("hidden");
	resultCard.classList.add("hidden");
	questionNav.classList.add("hidden");

	// Show profile card
	profileCard.classList.remove("hidden");

	// Populate profile card
	populateProfileCard();
}

function populateProfileCard() {
	const profileCard = document.querySelector(".profile-card");
	const username = User.getStoredUsername();

	if (!username) {
		profileCard.innerHTML = `
			<h1>User Profile</h1>
			<p>No user logged in</p>
			<button type="button" class="return-from-profile">Back</button>
		`;
		// Add event listener for return button
		// const returnBtn = profileCard.querySelector(".return-from-profile");
		// returnBtn.onclick = returnFromProfile;
	} else {
		const user = new User(username);

		let profileHTML = `<h1>User Profile</h1><h2>Welcome, ${username}!</h2>`;

		if (!user.quizHistory || user.quizHistory.length === 0) {
			profileHTML += `<p>No quiz history yet. Take a quiz to see your scores here!</p>`;
		} else {
			profileHTML += `<h3>Quiz History</h3><div class="score-list">`;
			user.quizHistory.forEach((quiz, index) => {
				console.log(quiz.category);
				const categoryName = getCategoryName(quiz.category);
				profileHTML += `
					<div class="score-item">
						<h4>Quiz ${index + 1} - ${new Date(quiz.date).toLocaleDateString()}</h4>
						<p>Score: ${quiz.score}%</p>
						<p>Questions: ${quiz.numQuestions}</p>
						<p>Category: ${categoryName}</p>
						<p>Difficulty: ${quiz.difficulty || "Any"}</p>
						<p>Type: ${quiz.type || "Any"}</p>
					</div>
				`;
			});
			profileHTML += `</div>`;
		}

		profileHTML += `<button type="button" class="return-from-profile">Back</button>`;
		profileCard.innerHTML = profileHTML;
	}
	// Add event listener for return button
	const returnBtn = profileCard.querySelector(".return-from-profile");
	returnBtn.onclick = returnFromProfile;
}

function getCategoryName(categoryValue) {
	const categories = {
		any: "Any Category",
		9: "General Knowledge",
		10: "Entertainment: Books",
		11: "Entertainment: Film",
		12: "Entertainment: Music",
		13: "Entertainment: Musicals & Theatres",
		14: "Entertainment: Television",
		15: "Entertainment: Video Games",
		16: "Entertainment: Board Games",
		17: "Science & Nature",
		18: "Science: Computers",
		19: "Science: Mathematics",
		20: "Mythology",
		21: "Sports",
		22: "Geography",
		23: "History",
		24: "Politics",
		25: "Art",
		26: "Celebrities",
		27: "Animals",
		28: "Vehicles",
		29: "Entertainment: Comics",
		30: "Science: Gadgets",
		31: "Entertainment: Japanese Anime & Manga",
		32: "Entertainment: Cartoon & Animations",
	};
	return categories[categoryValue] || "Unknown";
}

function returnFromProfile() {
	const apiForm = document.querySelector(".api-form");
	const questionCard = document.querySelector(".question-card");
	const resultCard = document.querySelector(".result-card");
	const questionNav = document.querySelector(".question-nav");
	const profileCard = document.querySelector(".profile-card");

	profileCard.classList.add("hidden");

	if (previousView === "api-form" || previousView === "results") {
		apiForm.classList.remove("hidden");
	} else if (previousView === "quiz") {
		questionCard.classList.remove("hidden");
		questionNav.classList.remove("hidden");
	}
}

apiForm.addEventListener("submit", async (event) => {
	event.preventDefault(); 

	const numQuestions = document.getElementById("trivia_amount").value;
	const category = document.querySelector(
		'select[name="trivia_category"]'
	).value;
	const difficulty = document.querySelector(
		'select[name="trivia_difficulty"]'
	).value;
	const type = document.querySelector('select[name="trivia_type"]').value;

	const quiz = new Quiz(Date.now(), category, difficulty, type);
	currentQuiz = quiz;

	const storedUsername = User.getStoredUsername();
	if (storedUsername) {
		quiz.user = new User(storedUsername);
	}

	await quiz.init(numQuestions);
});
// TODO: Implement the User class (properties like username and score history)
class User {
	constructor(username) {
		this.username = username;
		this.quizHistory = this.loadQuizHistory();
	}

	loadQuizHistory() {
		try {
			const stored = localStorage.getItem(`user_${this.username}`);
			if (!stored) return [];
			const parsed = JSON.parse(stored);
			// Ensure it's an array
			return Array.isArray(parsed) ? parsed : [];
		} catch (error) {
			console.error("Error loading quiz history:", error);
			// Clear corrupted data
			localStorage.removeItem(`user_${this.username}`);
			return [];
		}
	}

	saveQuizResult(score, numQuestions, category, difficulty, type, date) {
		// Ensure quizHistory is an array
		if (!Array.isArray(this.quizHistory)) {
			this.quizHistory = [];
		}
		this.quizHistory.push({
			score,
			numQuestions,
			category,
			difficulty,
			type,
			date,
		});
		localStorage.setItem(
			`user_${this.username}`,
			JSON.stringify(this.quizHistory)
		);
	}

	static getStoredUsername() {
		return localStorage.getItem("currentUsername");
	}

	static setStoredUsername(username) {
		localStorage.setItem("currentUsername", username);
	}

	static clearStoredUsername() {
		localStorage.removeItem("currentUsername");
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
					// It's now "View Scores" - go to profile page
					displayUserProfile();
				}
			}
			if (e.target == action2) {
				// Check if button still has submit-quiz class
				if (e.target.classList.contains("submit-quiz")) {
					this.submitQuiz();
				} else {
					// It's now "Return Home" - return to api form
					this.returnHome();
				}
			}
		});

		const saveUsernameBtn = document.querySelector(".username-btn");
		saveUsernameBtn.addEventListener("click", (e) => {
			const usernameInput = document.querySelector(".username-input");
			const username = usernameInput.value.trim();
			if (username) {
				this.user = new User(username);
				User.setStoredUsername(username);
				// Save the quiz result
				this.user.saveQuizResult(
					this.score,
					this.numQuestions,
					this.category,
					this.difficulty,
					this.type,
					this.start_time
				);
				// Hide username input and show confirmation
				usernameInput.classList.add("hidden");
				saveUsernameBtn.classList.add("hidden");
				document.querySelector(
					".username-prompt"
				).textContent = `Score saved for ${username}!`;
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
		toggleHidden([
			".question-card",
			".result-card",
			".question-nav",
			".quiz-actions",
		]);

		const scoreH1 = document.querySelector(".quiz-score");
		scoreH1.textContent = `Score: ${this.score}%`;

		// Check if user is already logged in
		if (this.user !== undefined) {
			console.log("welcome back");
			// Auto-save the score for logged-in users
			this.user.saveQuizResult(
				this.score,
				this.numQuestions,
				this.category,
				this.difficulty,
				this.type,
				this.start_time
			);
			document.querySelector(
				".username-prompt"
			).textContent = `Score saved for ${this.user.username}!`;
			document.querySelector(".username-prompt").classList.remove("hidden");
		} else {
			// Show username input for new users
			toggleHidden([".username-input", ".username-prompt", ".username-btn"]);
		}

		const action1 = document.querySelector(".action-1");
		action1.classList.remove("add-question");
		action1.classList.add("view-scores");
		const action2 = document.querySelector(".action-2");
		action2.classList.remove("submit-quiz");
		action2.classList.add("return-home");
		action1.textContent = "View Scores";
		action2.textContent = "Return Home";
	}

	returnHome() {
		// Hide result card and quiz actions
		const resultCard = document.querySelector(".result-card");
		const quizActions = document.querySelector(".quiz-actions");
		const apiForm = document.querySelector(".api-form");
		const usernameInput = document.querySelector(".username-input");
		const usernameBtn = document.querySelector(".username-btn");
		const usernamePrompt = document.querySelector(".username-prompt");

		resultCard.classList.add("hidden");
		quizActions.classList.add("hidden");
		apiForm.classList.remove("hidden");

		// Reset username input visibility
		if (!usernameInput.classList.contains("hidden")) {
			usernameInput.classList.add("hidden");
		}
		if (!usernameBtn.classList.contains("hidden")) {
			usernameBtn.classList.add("hidden");
		}
		if (!usernamePrompt.classList.contains("hidden")) {
			usernamePrompt.classList.add("hidden");
		}

		// Reset button states
		const action1 = document.querySelector(".action-1");
		const action2 = document.querySelector(".action-2");
		action1.classList.remove("view-scores");
		action1.classList.add("add-question");
		action2.classList.remove("return-home");
		action2.classList.add("submit-quiz");
		action1.textContent = "Add Question";
		action2.textContent = "Submit Quiz";

		// Reset quiz actions visibility for next quiz
		quizActions.classList.add("hidden");
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
