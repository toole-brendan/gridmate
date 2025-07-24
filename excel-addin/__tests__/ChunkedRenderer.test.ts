import { ChunkedRenderer } from '../src/services/streaming/ChunkedRenderer';

describe('ChunkedRenderer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should batch updates at specified interval', async () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ onUpdate, flushInterval: 50 });
    
    renderer.addChunk('Hello ');
    renderer.addChunk('World');
    
    expect(onUpdate).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(60);
    
    expect(onUpdate).toHaveBeenCalledWith('Hello World');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
  
  it('should force flush on large buffer', () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ 
      onUpdate, 
      maxBufferSize: 10 
    });
    
    renderer.addChunk('This is a long message');
    
    expect(onUpdate).toHaveBeenCalledWith('This is a long message');
  });

  it('should handle forceFlush correctly', () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ onUpdate });
    
    renderer.addChunk('Test ');
    renderer.addChunk('content');
    
    expect(onUpdate).not.toHaveBeenCalled();
    
    renderer.forceFlush();
    
    expect(onUpdate).toHaveBeenCalledWith('Test content');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should clean up on destroy', () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ onUpdate });
    
    renderer.addChunk('Test');
    renderer.destroy();
    
    expect(onUpdate).toHaveBeenCalledWith('Test');
    
    // Adding more chunks after destroy should not trigger updates
    renderer.addChunk('More');
    jest.advanceTimersByTime(200);
    
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should not flush empty buffer', () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ onUpdate });
    
    renderer.forceFlush();
    
    expect(onUpdate).not.toHaveBeenCalled();
  });
});