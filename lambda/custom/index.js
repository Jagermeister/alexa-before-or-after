'use strict';
const Alexa = require('ask-sdk');

const SESSION_BEGIN_MESSAGE = "Welcome! Before or After will challenge your abilities to reason and recall!";
const SESSION_END_MESSAGE = "See you next time for more historical challenges!";
const HELP_MESSAGE = "I will ask you which event occurred first! Say \"Let's Play\" to get started!";
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
const EVENT_YEAR_MIN_DEFAULT = 32;
const EVENT_YEAR_MAX_DEFAULT = 256;

const NEW_GAME_START_PHRASES = [
    "Here we go!",
    "Now we are starting!",
    "Try your best!",
    "Let's play!",
    "Going for the gold."
];
const NEXT_QUESTION_PHRASES = [
    "Here's your next question.",
    "OK here you go.",
    "Let's try this one.",
    "Next up.",
    "Ready? Here goes.",
    ""
];
const CORRECT_ANSWER_PHRASES = [
    "Exactly - that's right!",
    "Right on! That's correct!",
    "Perfect! Great answer!",
    "You're right with that one.",
    "You are right.",
    "Correcto.",
    "Correct.",
    "Right as rain.",
    "Right!",
    "You got this one!",
    "You got it!",
    "Yes!"
];
const WRONG_ANSWER_PHRASES = [
    "Sorry, that's not right.",
    "Ooh, missed that one!",
    "Unlucky!",
    "Not quite this time.",
    "Better luck next time.",
    "Oh no.",
    "No.",
    "That's not correct.",
    "That's not right."
];


function documentAPL(title, text, subtitle = '') {
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        version: '1.0',
        document: {
            "type": "APL",
            "version": "1.0",
            "import": [{
                "name": "alexa-layouts",
                "version": "1.0.0"
            }],
            "mainTemplate": {
                "parameters": ["payload"],
                "items": [{
                    "type": "Container",
                    "height": "100vh",
                    "items": [{
                        "type": "AlexaHeader",
                        "headerTitle": title,
                        "headerSubtitle": subtitle,
                        "headerBackgroundColor": "#4682b4"
                    }, {
                        "type": "Text",
                        "text": text
                    }]
                }]
            }
        }
    }
}

/**
 * Choose a response from a list of options
 * @param {string[]} phrases Possible responses
 */
function phrasePick(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
}

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
function buildSpeakAndRepromptResponse(title, speak, reprompt, subtitle = '') {
    return handlerInput => {
        if (isAlexaPresentationLanguageSupported(handlerInput)) {
            return handlerInput.responseBuilder
                .speak(speak)
                .reprompt(reprompt)
                .addDirective(documentAPL(title, speak, subtitle))
                .getResponse();
        } else {
            return handlerInput.responseBuilder.speak(speak).reprompt(reprompt).getResponse();
        }
    }
}

function isAlexaPresentationLanguageSupported(handlerInput) {
    return 'Alexa.Presentation.APL' in handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
}


const NewGameHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, STORY_EVENT_COMMANDS)(handlerInput),
    handle: handlerInput => {
        initalizeStateSession(handlerInput);
        return promptNextStoryEventChallenge(handlerInput, phrasePick(NEW_GAME_START_PHRASES));
    }
};

function initalizeStateSession(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.challenges = 0;
    attributes.successAnswer = 0;
    attributes.seenEvents = [];
    attributes.yearMax = EVENT_YEAR_MAX_DEFAULT;
    attributes.yearMin = EVENT_YEAR_MIN_DEFAULT;
    attributes.isFinished = false;
    handlerInput.attributesManager.setSessionAttributes(attributes);
}

function promptNextStoryEventChallenge(handlerInput, textPrefix = '') {
    const story = fetchNextEventChallenge(handlerInput);
    const speechOutput = `${textPrefix} Did ${story.a.t} occur BEFORE or AFTER ${story.b.t}?`;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const subtitle = `  Question ${attributes.challenges + 1} of ${CHALLENGES_LAST_COUNT + 1}`;
    return buildSpeakAndRepromptResponse('BEFORE OR AFTER?', speechOutput, speechOutput, subtitle)(handlerInput);
}

function fetchNextEventChallenge(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const yearMax = attributes.yearMax;
    const yearMin = attributes.yearMin;
    const seen = attributes.seenEvents;

    let story_event_a, story_event_b;
    [story_event_a, story_event_b] = eventsByAttributes(seen, yearMin, yearMax);

    attributes.seenEvents.push(story_event_a.i, story_event_b.i);
    attributes.lastBefore = story_event_a.y < story_event_b.y;
    handlerInput.attributesManager.setSessionAttributes(attributes);

    return {
        a: story_event_a,
        b: story_event_b
    };
}

function eventsByAttributes(seen, yearMin, yearMax) {
    const events = require('./data/events.json');
    const options = seen ? events.filter(e => seen.indexOf(e.i) === -1) : events;

    const eventOneKey = Math.floor(Math.random() * options.length);
    const eventOne = options[eventOneKey];
    delete options[eventOneKey];

    const eventsChoose = options.filter(e =>
        Math.abs(e.y - eventOne.y) >= yearMin
        && Math.abs(e.y - eventOne.y) <= yearMax
        && e.y !== eventOne.y);
    let eventTwo = eventsChoose.length ?
        eventsChoose[Math.floor(Math.random() * eventsChoose.length)] :
        options[Math.floor(Math.random() * options.length)];

    return [eventOne, eventTwo];
}

const AnswerHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, ANSWER_COMMANDS)(handlerInput) && attributes.challenges < CHALLENGES_LAST_COUNT
    },
    handle(handlerInput) {
        const speechOutput = processAnswerResponse(handlerInput) + " " + phrasePick(NEXT_QUESTION_PHRASES);
        return promptNextStoryEventChallenge(handlerInput, speechOutput)
    }
};

function processAnswerResponse(handlerInput) {
    const answerSlot = handlerInput.requestEnvelope.request.intent.slots.answer.value;
    return updateBasedOnAnswer(handlerInput, answerSlot)
}

function updateBasedOnAnswer(handlerInput, answerSlot) {
    let message = "";
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.challenges++;
    if ((attributes.lastBefore && answerSlot == "before") || (!attributes.lastBefore && answerSlot == "after")) {
        attributes.successAnswer++;
        attributes.yearMax /= 2;
        attributes.yearMin /= 2;
        message = phrasePick(CORRECT_ANSWER_PHRASES);
    } else {
        attributes.yearMax = Math.min(attributes.yearMax * 2, EVENT_YEAR_MAX_DEFAULT);
        attributes.yearMin = Math.min(attributes.yearMax * 2, EVENT_YEAR_MIN_DEFAULT);
        message = phrasePick(WRONG_ANSWER_PHRASES);
    }

    attributes.isFinished = attributes.challenges >= CHALLENGES_LAST_COUNT;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    return message
}

const FinalScoreHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, ANSWER_COMMANDS)(handlerInput)
            && attributes.isFinished && attributes.challenges <= CHALLENGES_LAST_COUNT;
    },
    handle(handlerInput) {
        const finalAnswer = processAnswerResponse(handlerInput);
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const speak = `${finalAnswer} That ends this round! ` +
            `Your final score is ${attributes.successAnswer} out of ${attributes.challenges}. `;
        const reprompt = "Say \"Let's Play\" to start another round.";
        const subtitle = `${attributes.successAnswer} out of ${attributes.challenges} correct`;
        return buildSpeakAndRepromptResponse('FINAL SCORE', speak + reprompt, reprompt, subtitle)(handlerInput);
    }
};


const LaunchRequestHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(LAUNCH_REQUEST_TYPE)(handlerInput),
    handle: handlerInput => buildSpeakAndRepromptResponse('WELCOME', WELCOME_MESSAGE, HELP_MESSAGE)(handlerInput)
};

const HelpIntentHandler = {
    canHandle: handlerInput => canHandleRequestTypeAndName(INTENT_REQUEST_TYPE, HELP_COMMANDS)(handlerInput),
    handle: handlerInput => buildSpeakAndRepromptResponse("Let's Play!", HELP_MESSAGE, HELP_MESSAGE)(handlerInput)
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
    handle(handlerInput) {
        console.log(`Command fallback: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
        return handlerInput.responseBuilder.speak(FALLBACK_MESSAGE).getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NewGameHandler,
        AnswerHandler,
        FinalScoreHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        ErrorHandler)
    .lambda();
