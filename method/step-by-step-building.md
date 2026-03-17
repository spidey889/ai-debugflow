# Step-By-Step Building

The core workflow is:

`break -> test -> debug -> verify -> repeat -> clean`

This method keeps feature work small, visible, and easier to recover when something goes wrong.

## Break

Split the feature into the smallest useful step.

A good step is small enough to explain in one or two sentences and small enough to test quickly. If a task feels vague or heavy, break it again.

## Test

Check the step as soon as it exists.

Do not wait until the full feature is complete. Early testing catches wrong assumptions before they spread into other parts of the work.

## Debug

If the result is wrong or unclear, make the flow visible.

Use logs, status output, or other simple signals to see what actually happened. Debugging is easier when you can observe the path directly.

## Verify

After each fix, confirm that the expected behavior now happens.

Verification matters because a change that looks correct is not always a change that behaves correctly.

## Repeat

Once one step is stable, move to the next small step.

This creates steady progress without losing control of the system.

## Clean

After the feature works, remove temporary noise and simplify the result.

Cleanup can include:

- removing extra debug output
- tightening wording
- reducing unnecessary complexity
- documenting the final method clearly

## Practical Rules

- build one small thing at a time
- keep the current step easy to test
- fix confirmed problems before adding new layers
- prefer visible behavior over hidden assumptions
- clean up only after the flow is working

This workflow is simple on purpose. Simple methods are easier to repeat, teach, and trust.
