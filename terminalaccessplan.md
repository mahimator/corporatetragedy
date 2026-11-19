-- this file explains ChatGPT Web how to access my laptop terminal using opencode --
-- create the file system if already not there, and estabilish the rules --

The file system {
    agentFiles{
        instructionsOpenCode.md
            (this file contains instructions for opencode agent)
        instructionsChatGPT.md
            (this file contains instructions for chatGPT Web)
        tasksRes.json
            (this file contains the results of the prompts run by opencode's terminal)
        prompts.json
            (this contains the prompts written and reviewed by ChatGPT and marked by opencode)
    }
    restOfTheRepo{}
}

file content {
    instructionsOpenCode.md {
        -- these instructions only apply to opencode and not ChatGPT --
        /* run a background service that listens to any updates made by the chatGPT to "prompts.json", a new prompt is detected and marked "detected" and then it is run on the terminal, the output of the terminal when arrives the prompt is marked "ran (int n, where n is iterative) times" and then the terminal output is pasted onto the "taskRes.json" file along with the serial number of the prompt, with the tag "first output" if chatGPT updates the tag to "passed" then stop, and if chatGPT updates the tag to "failed" regenerate the response according to new prompt by chatGPT, after a new prompt get detected in prompts.json */ 
    }

    instructionsChatGPT.md {
        -- these instructions only apply to ChatGPT and not opencode --
        /* everytime you need to use a terminal to build something or test something, write a new prompt along with a random serial number to "prompts.json" and wait for the marking update as "detected" then wait for the terminal output to arrive in "taskRes.json" once it has arrived, evaluate the terminal response and mark it accordingly "passed" or "failed" and if it is a pass then continue with your terminal output that you needed, and if it is a fail create a new prompt and wait for it to appear in "taskRes.json" and iterate until it passes.*/
    }
}

additional formats {
    promptFormat {
        "run the command <command> in terminal"
    }
}

