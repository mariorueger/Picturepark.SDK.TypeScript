import { Component, OnInit, Input } from '@angular/core';
import {
  ContentService,
  ContentDetail, ContentResolveBehavior, ContentDownloadLinkCreateRequest, Output
} from '@picturepark/sdk-v1-angular';
import { map } from 'rxjs/operators';
import { BaseComponent } from '../base.component';

@Component({
  selector: 'pp-output-download-menu',
  templateUrl: './output-download-menu.component.html',
  styleUrls: ['./output-download-menu.component.scss']
})
export class OutputDownloadMenuComponent extends BaseComponent implements OnInit {
  @Input() public id: string;
  @Input() public formats: string[];
  @Input() public overlapTrigger: boolean = false;
  // possible values  'above' | 'below'
  @Input() public yPosition: string = 'above';
  // possible values 'before' | 'after'
  @Input() public xPosition: string = 'before';

  public outputFormats: string[];

  constructor(private contentService: ContentService) {
    super();
  }

  public ngOnInit() {
    if (!this.id) {
      throw new Error('Image is not defined !');
    }
  }

  public getOutputFormats() {
    if (this.formats) {
      this.outputFormats = this.formats;
    }
    else {
      const sub = this.contentService.get(this.id,
        [ContentResolveBehavior.Outputs]).pipe(
          map((contentDetail: ContentDetail) => contentDetail.outputs),
          map((outputs: (Output[] | undefined)) => outputs && outputs.map(o => o.outputFormatId))
        )
        .subscribe((outputFormatIds: string[]) => {
          this.outputFormats = outputFormatIds;
        });

      this.subscription.add(sub);
    }
  }

  public download(outputFormatId: string) {
    const request = new ContentDownloadLinkCreateRequest({
      contents: [{ contentId: this.id, outputFormatId: outputFormatId }]
    });

    const createDownloadSubscription = this.contentService.createDownloadLink(request).subscribe(data => {
      if (data.downloadUrl) {
        window.location.replace(data.downloadUrl);
      }
    });

    this.subscription.add(createDownloadSubscription);
  }

  public trackByFormat(index, format: string) {
    return format;
  }
}
