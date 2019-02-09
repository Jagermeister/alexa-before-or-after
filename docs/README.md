# Before or After?
A historical event game where players determine which event occurred first!
> Did `Amelia Earhart solo flight across the Atlantic Ocean` occur BEFORE or AFTER `The Empire State Building opened in New York City`?

> After! By just one year, Amelia Earhart's historical flight took place in `1932`!

## How to play?
Add this Alexa skill by saying "Enable Before or After". To start the application say "Open Before or After" or "Play Before or After". All Alexa devices should be capable of playing and viewing content produced by this skill.

## Technical
### Testing
NPM script `test` is configured with package alexa-skill-local to route requests to your local codebase from the Alexa Developer Console Test.

### Deployment
#### AWS Lambda
Everything within `lambda/custom` needs to be zipped (including node_modules) and uploaded to AWS.