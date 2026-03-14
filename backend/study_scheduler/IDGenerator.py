class IDGenerator:
    def __init__(self, TaskCount=0):
        self.TaskCount = TaskCount

    def NextTask(self):
        self.TaskCount += 1
        return self.TaskCount

    def Copy(self):
        return IDGenerator(self.TaskCount)
