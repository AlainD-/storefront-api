import { DisplayProcessor, SpecReporter, StacktraceOption } from 'jasmine-spec-reporter';
import JasmineStartedInfo = jasmine.JasmineStartedInfo;

class CustomProcessor extends DisplayProcessor {
  private infoMessage = '';

  public displayJasmineStarted(info: JasmineStartedInfo, log: string): string {
    this.infoMessage = `TypeScript ${log}`;
    return this.infoMessage;
  }
}

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: {
      displayStacktrace: StacktraceOption.NONE,
    },
    customProcessors: [CustomProcessor],
  })
);
