import {
  Component, EventEmitter, Input, Output, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef, Inject, SimpleChanges, OnChanges, forwardRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/map';

import {
  ContentService, ContentDetail, AuthService, ImageMetadata, ThumbnailSize,
  ContentType, ContentDownloadLinkCreateRequest, ContentDownloadRequestItem, DownloadLink
} from '@picturepark/sdk-v1-angular';
import { OidcAuthService } from '@picturepark/sdk-v1-angular-oidc';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ContentPickerComponent } from '../content-picker/content-picker.component';

@Component({
  selector: 'pp-content-picker-details',
  templateUrl: './content-picker-details.component.html'
})
export class ContentPickerDetailsComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input()
  contentId: string | undefined;
  @Output()
  contentIdChange = new EventEmitter<string | undefined>();
  content: ContentDetail;

  thumbnailUrl: string;
  thumbnailUrlSafe: SafeUrl;

  windowHeight: string;

  constructor(private contentService: ContentService,
    private sanitizer: DomSanitizer,
    @Inject(AuthService) public authService: OidcAuthService,
    @Inject(forwardRef(() => ContentPickerComponent)) private parent: ContentPickerComponent) {
    this.recalculateSizes();
  }

  ngOnInit() {
    if (!this.authService.isAuthorized && this.authService.isAuthorizing === false) {
      this.authService.login();
    }

    window.addEventListener('resize', this.onWindowResized, false);
    this.recalculateSizes();
  }

  ngAfterViewInit() {
    this.recalculateSizes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.contentId) {
      this.contentService.downloadThumbnail(this.contentId, ThumbnailSize.Medium).subscribe(response => {
        this.thumbnailUrl = URL.createObjectURL(response!.data!);
        this.thumbnailUrlSafe = this.sanitizer.bypassSecurityTrustUrl(this.thumbnailUrl);
      });

      this.contentService.get(this.contentId, true, []).subscribe((content: ContentDetail) => {
        this.content = content;
      });
    }
  }

  showFullscreen() {
    const isPdf = this.content.contentType === ContentType.InterchangeDocument;
    const isAudio = this.content.contentType === ContentType.Audio;
    const isVideo = this.content.contentType === ContentType.Video;

    const isMovie = isAudio || isVideo;
    const isImage = !isMovie && !isPdf;

    const previewOutput =
      isPdf ? this.content.outputs!.filter(o => o.outputFormatId === 'Original')[0] :
        isAudio ? this.content.outputs!.filter(o => o.outputFormatId === 'AudioSmall')[0] :
          isVideo ? this.content.outputs!.filter(o => o.outputFormatId === 'VideoSmall')[0] :
            this.content.outputs!.filter(o => o.outputFormatId === 'Preview')[0];

    const request = new ContentDownloadLinkCreateRequest({
      contents: [
        new ContentDownloadRequestItem({
          contentId: this.contentId,
          outputFormatId: previewOutput.outputFormatId
        })
      ]
    });

    this.contentService.createDownloadLink(request).subscribe((response: DownloadLink) => {
      const item: IShareItem = {
        id: this.content.id!,

        isPdf: isPdf,
        isImage: isImage,
        isMovie: isMovie,
        isBinary: false,

        displayValues: {},
        previewUrl: isImage ? response.downloadUrl! : this.thumbnailUrl,

        originalUrl: response.downloadUrl!,
        originalFileExtension: previewOutput.detail!.fileExtension!,

        detail: {
          width: (<any>previewOutput.detail).width,
          height: (<any>previewOutput.detail).height,
        }
      };

      ((<any>window).pictureparkWidgets).players.showDetailById(item.id, [item]);
    });
  }

  back() {
    this.contentId = undefined;
    this.contentIdChange.emit(this.contentId);
  }

  embed() {
    this.parent.embed([this.content]);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onWindowResized, false);
  }

  onWindowResized = () => {
    this.recalculateSizes();
  };

  recalculateSizes() {
    const windowHeight = window.innerHeight;
    this.windowHeight = (windowHeight - 96) + 'px';
  }
}

interface IShareItem {
  id: string;

  isImage: boolean;
  isPdf: boolean;
  isMovie: boolean;
  isBinary: boolean;

  displayValues: any;
  previewUrl: string;

  originalUrl: string;
  originalFileExtension: string;

  detail: {
    width: number;
    height: number;
  }
}