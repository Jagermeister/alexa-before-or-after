# Before or After?  [Alexa skill](https://www.amazon.com/dp/B07NQ6QVTD/)
A historical event game where players determine which event occurred first!
> Did `Amelia Earhart solo flight across the Atlantic Ocean` occur BEFORE or AFTER `The Empire State Building opened in New York City`?

![Before or After Icon](/icons/skill-icon-sm.png)

> After! By just one year, Amelia Earhart's historical flight took place in `1932`!

## How to play?
Add this Alexa skill by saying "Enable Before or After". To start the application say "Open Before or After" or "Play Before or After". All Alexa devices should be capable of playing and viewing content produced by this skill.

## Features
- US History and Current Events
- Adaptive strength allows for more challenges questions when you succeed

## Technical
### Testing
NPM script `test` is configured with package alexa-skill-local to route requests to your local codebase from the Alexa Developer Console Test.

### Deployment
#### AWS Lambda
Everything within `lambda/custom` needs to be zipped (including node_modules) and uploaded to AWS.



## F U T U R E
- Use [SSML](https://developer.amazon.com/docs/custom-skills/speech-synthesis-markup-language-ssml-reference.html) to correctly pronounce any foreign words
- Allow different levels of text description based on screen size
- Allow for read along scrolling on devices
- Take advantage of touch screens on devices to select answer
- Provide context aware fallbacks instead of global ("Say before or after to answer, or lets play to start")
- Provide historical summary of player performance ("18 correct this week throughout 5 quizes!")
- Establish packs of events and enable in-skill monetization
- Overhaul of skill icon and APL background images
