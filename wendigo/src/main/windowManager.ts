import { BrowserWindow, screen } from 'electron'

export class WindowManager {
  private mainWindow: BrowserWindow
  private isDocked: boolean = true
  private lastPosition: { x: number; y: number } | null = null

  constructor(window: BrowserWindow) {
    this.mainWindow = window
    this.setupWindowBehavior()
  }

  private setupWindowBehavior(): void {
    this.mainWindow.on('moved', () => {
      const bounds = this.mainWindow.getBounds()
      this.lastPosition = { x: bounds.x, y: bounds.y }
    })

    this.mainWindow.on('resized', () => {
      this.checkDockingStatus()
    })
  }

  private checkDockingStatus(): void {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width } = primaryDisplay.workAreaSize
    const bounds = this.mainWindow.getBounds()

    this.isDocked = bounds.x + bounds.width >= width - 50
  }

  public toggleDocking(): void {
    if (this.isDocked && this.lastPosition) {
      this.mainWindow.setPosition(this.lastPosition.x, this.lastPosition.y)
      this.isDocked = false
    } else {
      this.dockToRight()
    }
  }

  public dockToRight(): void {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const windowWidth = 400

    this.mainWindow.setBounds({
      x: width - windowWidth - 20,
      y: 50,
      width: windowWidth,
      height: height - 100
    })
    this.isDocked = true
  }

  public setAlwaysOnTop(value: boolean): void {
    this.mainWindow.setAlwaysOnTop(value)
  }

  public isAlwaysOnTop(): boolean {
    return this.mainWindow.isAlwaysOnTop()
  }

  public setOpacity(value: number): void {
    this.mainWindow.setOpacity(value)
  }
}