'use strict';
const Alexa = require('ask-sdk');

const SESSION_BEGIN_MESSAGE = "Welcome! Before or After will challenge your abilities to reason and recall!";
const SESSION_END_MESSAGE = "See you next time for more historical challenges!";
const HELP_MESSAGE = "I will ask you to determine which event in a list occurred first! Say \"Let's Play\" to get started!";
const FALLBACK_MESSAGE = "Sorry, I don't understand that command. Try \"Let's Play\" to get started!";
const WELCOME_MESSAGE = SESSION_BEGIN_MESSAGE + ' ' + HELP_MESSAGE;

const STORY_EVENT_COMMANDS = ["StartGame", "AMAZON.StartOverIntent"];
const ANSWER_COMMANDS = ["AnswerIntent"];
const STOP_CANCEL_COMMANDS = ["AMAZON.CancelIntent", "AMAZON.StopIntent"];
const HELP_COMMANDS = ["AMAZON.HelpIntent"];

const LAUNCH_REQUEST_TYPE = 'LaunchRequest';
const INTENT_REQUEST_TYPE = 'IntentRequest';
const SESSON_END_REQUEST_TYPE = 'SessionEndedRequest';

const CHALLENGES_LAST_COUNT = 4;

/**
 * Helper to confirm matching Request Type and
 * Intent Name. Reduces overall duplication.
 * @param {string} type Request Type
 * @param {string[]} names Request Intent Name
 */
function canHandleRequestTypeAndName(type, names = []) {
    return handlerInput => handlerInput.requestEnvelope.request.type === type &&
        (names.length === 0 || names.indexOf(handlerInput.requestEnvelope.request.intent.name) > -1)
}

/**
 * Helper to reduce chaining together a common
 * pattern of speaking and awaiting response.
 * @param {string} speak Text Alexa will speak
 * @param {string} reprompt Alexa will reprompt users with this text
 */
function buildSpeakAndRepromptResponse(speak, reprompt) {
    return handlerInput => handlerInput.responseBuilder.speak(speak).reprompt(reprompt).getResponse();
}


const NewGameHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, STORY_EVENT_COMMANDS)(handlerInput),
    handle: handlerInput => {
        initalizeStateSession(handlerInput);
        return promptNextStoryEventChallenge(handlerInput, "Here we go!");
    }
};

function initalizeStateSession(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.challenges = 0;
    attributes.successAnswer = 0;
    attributes.isFinished = false;
    handlerInput.attributesManager.setSessionAttributes(attributes);
}

function promptNextStoryEventChallenge(handlerInput, textPrefix='') {
    const story = fetchNextEventChallenge(handlerInput);
    const speechOutput = `${textPrefix} Did ${story.a.title} occur BEFORE or AFTER ${story.b.title}?`;
    return buildSpeakAndRepromptResponse(speechOutput, speechOutput)(handlerInput);
}

function fetchNextEventChallenge(handlerInput) {
    // Fetch New Story Events
    const story_event_a = { "year": 1932, "title": "Amelia Earhart solo flight across the Atlantic Ocean" };
    const story_event_b = { "year": 1931, "title": "The Empire State Building opened in New York City" };

    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.lastBefore = story_event_a.year < story_event_b.year;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return {
        a: story_event_a,
        b: story_event_b
    };
}

const AnswerHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, ANSWER_COMMANDS)(handlerInput) && attributes.challenges < CHALLENGES_LAST_COUNT
    },
    handle(handlerInput) {
        const answerSlot = handlerInput.requestEnvelope.request.intent.slots.answer.value;
        const resultMessage = updateBasedOnAnswer(handlerInput, answerSlot);
        const speechOutput = resultMessage + " Here's your next question.";
        return promptNextStoryEventChallenge(handlerInput, speechOutput)
    }
};

function updateBasedOnAnswer(handlerInput, answerSlot) {
    let message = "";
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.challenges++;
    if ((attributes.lastBefore && answerSlot == "before") || (!attributes.lastBefore && answerSlot == "after")) {
        attributes.successAnswer++;
        message = "Exactly! Right on!";
    } else {
        message = "Nope. We were looking for " + (answerSlot == "before" ? "after" : "before") + ".";
    }

    attributes.isFinished = attributes.challenges > CHALLENGES_LAST_COUNT;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    return message
}

const FinalScoreHandler = {
	canHandle(handlerInput) {
		const attributes = handlerInput.attributesManager.getSessionAttributes();
		return canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, ANSWER_COMMANDS)(handlerInput) && attributes.isFinished;
	},
	handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
		return handlerInput.responseBuilder
			.speak("With that final question, your final score is " + attributes.successAnswer + " out of " + attributes.challenges)
			.getResponse();
	}
};


const LaunchRequestHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(LAUNCH_REQUEST_TYPE)(handlerInput),
    handle: handlerInput => buildSpeakAndRepromptResponse(WELCOME_MESSAGE, HELP_MESSAGE)(handlerInput)
};

const HelpIntentHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, HELP_COMMANDS)(handlerInput),
    handle: handlerInput => buildSpeakAndRepromptResponse(HELP_MESSAGE, HELP_MESSAGE)(handlerInput)
};

const CancelAndStopIntentHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, STOP_CANCEL_COMMANDS)(handlerInput),
    handle: handlerInput => handlerInput.responseBuilder.speak(SESSION_END_MESSAGE).getResponse()
};

const SessionEndedRequestHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(SESSON_END_REQUEST_TYPE)(handlerInput),
    handle: handlerInput => handlerInput.responseBuilder.getResponse()
};

const ErrorHandler = {
    canHandle: () => true,
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        return buildSpeakAndRepromptResponse(FALLBACK_MESSAGE, FALLBACK_MESSAGE)(handlerInput);
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(LaunchRequestHandler,
        NewGameHandler,
        AnswerHandler,
        FinalScoreHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        ErrorHandler)
    .lambda();
