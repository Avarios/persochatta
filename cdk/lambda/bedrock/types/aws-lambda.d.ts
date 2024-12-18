declare namespace awslambda {
    interface ResponseStream {
      setContentType(contentType: string): void;
      write(chunk: string): Promise<void>;
      end(): Promise<void>;
    }
  
    function streamifyResponse(
      handler: (event: any, responseStream: ResponseStream, context: any) => Promise<void>
    ): (event: any, context: any) => Promise<any>;
  }
